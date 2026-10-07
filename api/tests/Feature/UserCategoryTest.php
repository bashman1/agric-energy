<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Admin-side account creation for the two user populations: NREP staff and
 * platform partners. A partner organisation admin made here must come out
 * able to manage their team — i.e. linked to an organisation.
 */
class UserCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
            Role::findOrCreate($role, 'web');
        }
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);
        $admin->assignRole(Roles::PLATFORM_ADMIN);
        Sanctum::actingAs($admin);
    }

    private function org(): Partner
    {
        return Partner::create([
            'slug' => 'org-' . uniqid(),
            'name' => 'Test Org',
            'entity_kind' => 'organization',
            'published' => true,
            'workflow_status' => 'published',
        ]);
    }

    private function payload(array $extra): array
    {
        return $extra + [
            'name' => 'New Person',
            'email' => uniqid() . '@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ];
    }

    public function test_partner_admin_created_by_admin_is_linked_and_can_manage_team(): void
    {
        $org = $this->org();

        $res = $this->postJson('/api/v1/users', $this->payload([
            'roles' => [Roles::PARTNER_ADMIN],
            'partner' => $org->slug,
        ]))->assertCreated();

        $user = User::find($res->json('data.id'));
        $this->assertSame($org->id, $user->partner_id);
        $this->assertSame('Test Org', $user->organisation);
        $this->assertTrue($user->can('manage-partner-team'));
    }

    public function test_organisation_role_without_organisation_is_refused(): void
    {
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::PARTNER_ADMIN]]))
            ->assertStatus(422)->assertJsonValidationErrors('roles');
    }

    public function test_staff_and_partner_roles_cannot_mix(): void
    {
        $this->postJson('/api/v1/users', $this->payload([
            'roles' => [Roles::KNOWLEDGE_MANAGER, Roles::PARTNER],
        ]))->assertStatus(422)->assertJsonValidationErrors('roles');
    }

    public function test_existing_partner_can_be_linked_and_promoted(): void
    {
        $org = $this->org();
        $user = User::create([
            'name' => 'Partner',
            'email' => 'p@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);
        $user->assignRole(Roles::PARTNER);

        $this->putJson("/api/v1/users/{$user->id}/roles", [
            'roles' => [Roles::PARTNER_ADMIN],
            'partner' => $org->slug,
        ])->assertOk()->assertJsonPath('data.partnerId', $org->slug);

        $this->assertTrue($user->fresh()->can('manage-partner-team'));
    }

    private function makeUser(string $role): User
    {
        $user = User::create([
            'name' => ucfirst($role),
            'email' => $role . '-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);
        $user->assignRole($role);

        return $user;
    }

    public function test_platform_admin_does_not_see_super_admins(): void
    {
        $super = $this->makeUser(Roles::SUPER_ADMIN);

        $emails = collect($this->getJson('/api/v1/users')->assertOk()->json('data'))->pluck('email');
        $this->assertNotContains($super->email, $emails);
        $this->assertContains('admin@example.test', $emails);

        $this->postJson("/api/v1/users/{$super->id}/suspend")->assertNotFound();
        $this->putJson("/api/v1/users/{$super->id}/roles", ['roles' => [Roles::REVIEWER]])->assertNotFound();

        Sanctum::actingAs($super);
        $emails = collect($this->getJson('/api/v1/users')->json('data'))->pluck('email');
        $this->assertContains($super->email, $emails);
    }

    public function test_platform_admin_cannot_create_or_promote_platform_admins(): void
    {
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::PLATFORM_ADMIN]]))
            ->assertForbidden();

        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->putJson("/api/v1/users/{$km->id}/roles", ['roles' => [Roles::PLATFORM_ADMIN]])
            ->assertForbidden();

        // Other roles are still theirs to hand out.
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::REVIEWER]]))
            ->assertCreated();
    }

    public function test_super_admin_creates_platform_admins_but_not_super_admins(): void
    {
        $super = $this->makeUser(Roles::SUPER_ADMIN);
        Sanctum::actingAs($super);

        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::PLATFORM_ADMIN]]))
            ->assertCreated();
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::SUPER_ADMIN]]))
            ->assertForbidden();

        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->putJson("/api/v1/users/{$km->id}/roles", ['roles' => [Roles::SUPER_ADMIN]])
            ->assertForbidden();

        // Nor can a super-admin strip their own role and lock everyone out.
        $this->putJson("/api/v1/users/{$super->id}/roles", ['roles' => [Roles::PLATFORM_ADMIN]])
            ->assertForbidden();
    }
}
