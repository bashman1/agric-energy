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
        // The lowest administrator tier: everything below holds for it, and
        // the tests that need more act as a platform or super admin instead.
        $admin->assignRole(Roles::ORGANISATION_ADMIN);
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

    public function test_admins_create_staff_accounts_only(): void
    {
        $org = $this->org();

        // No partner role, linked to an organisation or not, for any tier.
        foreach ([Roles::ORGANISATION_ADMIN, Roles::PLATFORM_ADMIN, Roles::SUPER_ADMIN] as $tier) {
            Sanctum::actingAs($this->makeUser($tier));
            foreach (Roles::PARTNER_ROLES as $role) {
                $this->postJson('/api/v1/users', $this->payload([
                    'roles' => [$role],
                    'partner' => $org->slug,
                ]))->assertStatus(422)->assertJsonValidationErrors('roles.0');
            }
        }
        $this->assertSame(0, User::where('partner_id', $org->id)->count());

        // A staff account is never tied to an organisation, even if asked.
        $res = $this->postJson('/api/v1/users', $this->payload([
            'roles' => [Roles::KNOWLEDGE_MANAGER],
            'partner' => $org->slug,
        ]))->assertCreated();
        $this->assertNull(User::find($res->json('data.id'))->partner_id);
    }

    public function test_organisation_role_without_organisation_is_refused(): void
    {
        $partner = $this->makeUser(Roles::PARTNER);

        $this->putJson("/api/v1/users/{$partner->id}/roles", ['roles' => [Roles::PARTNER_ADMIN]])
            ->assertStatus(422)->assertJsonValidationErrors('roles');
    }

    public function test_staff_and_partner_roles_cannot_mix(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);

        $this->putJson("/api/v1/users/{$km->id}/roles", [
            'roles' => [Roles::KNOWLEDGE_MANAGER, Roles::PARTNER],
        ])->assertStatus(422)->assertJsonValidationErrors('roles');
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

    public function test_an_administrator_does_not_see_the_tiers_above(): void
    {
        $super = $this->makeUser(Roles::SUPER_ADMIN);
        $platform = $this->makeUser(Roles::PLATFORM_ADMIN);

        // Organisation admin: neither senior tier exists.
        $emails = collect($this->getJson('/api/v1/users')->assertOk()->json('data'))->pluck('email');
        $this->assertNotContains($super->email, $emails);
        $this->assertNotContains($platform->email, $emails);
        $this->assertContains('admin@example.test', $emails);

        foreach ([$super, $platform] as $senior) {
            $this->postJson("/api/v1/users/{$senior->id}/suspend")->assertNotFound();
            $this->putJson("/api/v1/users/{$senior->id}/roles", ['roles' => [Roles::REVIEWER]])->assertNotFound();
            // A password reset here would be a way to borrow the account.
            $this->patchJson("/api/v1/users/{$senior->id}", [
                'password' => 'newsecret1',
                'password_confirmation' => 'newsecret1',
            ])->assertNotFound();
        }

        // Platform admin: sees its own tier and below, never a super-admin.
        Sanctum::actingAs($platform);
        $emails = collect($this->getJson('/api/v1/users')->json('data'))->pluck('email');
        $this->assertNotContains($super->email, $emails);
        $this->assertContains($platform->email, $emails);
        $this->assertContains('admin@example.test', $emails);
        $this->postJson("/api/v1/users/{$super->id}/suspend")->assertNotFound();

        Sanctum::actingAs($super);
        $emails = collect($this->getJson('/api/v1/users')->json('data'))->pluck('email');
        $this->assertContains($super->email, $emails);
    }

    public function test_organisation_admin_cannot_hand_out_administrator_roles(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);

        foreach ([Roles::PLATFORM_ADMIN, Roles::ORGANISATION_ADMIN] as $role) {
            $this->postJson('/api/v1/users', $this->payload(['roles' => [$role]]))
                ->assertForbidden();
            $this->putJson("/api/v1/users/{$km->id}/roles", ['roles' => [$role]])
                ->assertForbidden();
        }

        // Nor take one away from a fellow organisation admin.
        $peer = $this->makeUser(Roles::ORGANISATION_ADMIN);
        $this->putJson("/api/v1/users/{$peer->id}/roles", ['roles' => [Roles::REVIEWER]])
            ->assertForbidden();

        // Other roles are still theirs to hand out.
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::REVIEWER]]))
            ->assertCreated();
    }

    public function test_platform_admin_has_super_admin_rights_except_system_configuration(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::PLATFORM_ADMIN));

        // Hands out both administrator roles below super-admin…
        foreach ([Roles::PLATFORM_ADMIN, Roles::ORGANISATION_ADMIN] as $role) {
            $this->postJson('/api/v1/users', $this->payload(['roles' => [$role]]))
                ->assertCreated();
        }
        $this->postJson('/api/v1/users', $this->payload(['roles' => [Roles::SUPER_ADMIN]]))
            ->assertForbidden();

        // …and reads the audit trail, which an organisation admin cannot…
        $this->getJson('/api/v1/audit')->assertOk();

        // …but system configuration stays with the super-admin.
        $this->putJson('/api/v1/site-config', [])->assertForbidden();
    }

    public function test_organisation_admin_has_no_audit_trail_or_system_configuration(): void
    {
        $this->getJson('/api/v1/audit')->assertForbidden();
        $this->putJson('/api/v1/site-config', [])->assertForbidden();
    }

    public function test_migration_moves_existing_platform_admins_down_a_tier(): void
    {
        $legacy = $this->makeUser(Roles::PLATFORM_ADMIN);

        $migration = require database_path('migrations/2026_10_12_000001_add_organisation_admin_role.php');
        $migration->up();

        $this->assertSame([Roles::ORGANISATION_ADMIN], $legacy->fresh()->getRoleNames()->all());
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

    public function test_admin_can_edit_a_user(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $km->createToken('t');

        $this->patchJson("/api/v1/users/{$km->id}", [
            'name' => 'Renamed',
            'email' => 'renamed@example.test',
            'password' => 'newsecret1',
            'password_confirmation' => 'newsecret1',
            'roles' => [Roles::REVIEWER],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonPath('data.roles', [Roles::REVIEWER]);

        $km->refresh();
        $this->assertSame('renamed@example.test', $km->email);
        $this->assertTrue(Hash::check('newsecret1', $km->password));
        $this->assertSame(0, $km->tokens()->count());
    }

    public function test_edit_keeps_the_same_guards_as_role_changes(): void
    {
        $super = $this->makeUser(Roles::SUPER_ADMIN);
        $this->patchJson("/api/v1/users/{$super->id}", ['name' => 'x'])->assertNotFound();

        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->patchJson("/api/v1/users/{$km->id}", ['roles' => [Roles::PLATFORM_ADMIN]])->assertForbidden();
        $this->patchJson("/api/v1/users/{$km->id}", ['email' => 'admin@example.test'])->assertStatus(422);

        // Unlinking an org admin from their organisation would strand the role.
        $org = $this->org();
        $pa = $this->makeUser(Roles::PARTNER_ADMIN);
        $pa->update(['partner_id' => $org->id]);
        $this->patchJson("/api/v1/users/{$pa->id}", ['partner' => null])->assertStatus(422);
    }
}
