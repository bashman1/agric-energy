<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * End-to-end coverage of the platform's critical guarantees: public read
 * scoping, partner onboarding/approval, RBAC, the editorial workflow, and
 * ranked search.
 */
class PlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['super-admin', 'editor', 'reviewer', 'partner'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    private function makeUser(string $role, string $status = User::STATUS_APPROVED): User
    {
        $user = User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => $status,
        ]);
        $user->assignRole($role);
        return $user;
    }

    private function publishedProject(array $attrs = []): Project
    {
        return Project::create(array_merge([
            'slug' => 'p-' . uniqid(),
            'title' => 'Solar Irrigation Project',
            'summary' => 'A solar powered irrigation scheme',
            'description' => 'Detailed description of solar pumping',
            'published' => true,
            'workflow_status' => 'published',
        ], $attrs));
    }

    public function test_public_sees_only_published_content(): void
    {
        $this->publishedProject(['title' => 'Public One']);
        Project::create([
            'slug' => 'draft-x',
            'title' => 'Hidden Draft',
            'published' => false,
            'workflow_status' => 'draft',
        ]);

        $res = $this->getJson('/api/v1/projects');
        $res->assertOk();
        $this->assertEquals(1, $res->json('total'));
    }

    public function test_partner_registration_creates_pending_account(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'accountType' => 'individual',
            'name' => 'Green Farms',
            'email' => 'gf@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $res->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'gf@example.test',
            'status' => User::STATUS_PENDING,
            'account_type' => 'individual',
            'partner_id' => null,
        ]);
        $this->assertTrue(User::where('email', 'gf@example.test')->first()->hasRole('partner'));
    }

    public function test_organization_registration_creates_pending_partner(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'accountType' => 'organization',
            'name' => 'Jane Admin',
            'email' => 'admin@greenenergy.test',
            'username' => 'greenenergy',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'category' => 'Non-Governmental Organization (NGO)',
            'partnerType' => 'Implementing Partner',
            'orgName' => 'Green Energy Uganda',
            'registrationNumber' => 'REG-123',
            'taxId' => 'TIN-456',
            'physicalAddress' => '123 Kampala Road',
            'sectors' => ['Renewable Energy', 'Agriculture'],
            'mission' => 'To promote renewable energy.',
            'description' => 'We implement renewable energy projects.',
            'expertise' => ['Research', 'Technology Development'],
            'contactName' => 'Jane Admin',
            'contactPosition' => 'Director',
            'contactEmail' => 'contact@greenenergy.test',
            'contactPhone' => '+256700000000',
            'coverageScope' => ['National'],
        ]);

        $res->assertCreated();

        $partner = \App\Models\Partner::where('name', 'Green Energy Uganda')->first();
        $this->assertNotNull($partner);
        $this->assertFalse((bool) $partner->published);
        $this->assertEquals('pending', $partner->workflow_status);
        $this->assertEquals(['Renewable Energy', 'Agriculture'], $partner->sectors);
        $this->assertEquals('Non-Governmental Organization (NGO)', $partner->category);
        $this->assertEquals('Implementing Partner', $partner->type);

        $user = User::where('email', 'admin@greenenergy.test')->first();
        $this->assertEquals('organization', $user->account_type);
        $this->assertEquals($partner->id, $user->partner_id);
        $this->assertEquals('greenenergy', $user->username);
    }

    public function test_organization_registration_requires_org_fields(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'accountType' => 'organization',
            'name' => 'No Org',
            'email' => 'noorg@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/register', [
            'accountType' => 'organization',
            'name' => 'No Org',
            'email' => 'noorg2@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'category' => 'NGO',
            'partnerType' => 'Implementing Partner',
            'orgName' => 'No Org',
            'registrationNumber' => 'REG-1',
            'taxId' => 'TIN-1',
            'physicalAddress' => 'Addr',
            'sectors' => ['Renewable Energy'],
            'mission' => 'Mission',
            'description' => 'Desc',
            'expertise' => ['Research'],
            'contactName' => 'Contact',
            'contactPosition' => 'Pos',
            'contactEmail' => 'c@example.test',
            'contactPhone' => '123',
            'username' => 'nouser',
        ])->assertStatus(422);
    }

    public function test_organization_registration_rejects_excess_expertise(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'accountType' => 'organization',
            'name' => 'Too Many',
            'email' => 'toomany@example.test',
            'username' => 'toomany',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'category' => 'NGO',
            'partnerType' => 'Implementing Partner',
            'orgName' => 'Too Many',
            'registrationNumber' => 'REG-1',
            'taxId' => 'TIN-1',
            'physicalAddress' => 'Addr',
            'sectors' => ['Renewable Energy'],
            'mission' => 'Mission',
            'description' => 'Desc',
            'expertise' => ['Research', 'Policy', 'Capacity Building', 'Financing'],
            'contactName' => 'Contact',
            'contactPosition' => 'Pos',
            'contactEmail' => 'c@example.test',
            'contactPhone' => '123',
        ])->assertStatus(422);
    }

    public function test_organization_registration_rejects_duplicate_username(): void
    {
        User::create([
            'name' => 'Existing',
            'email' => 'existing@example.test',
            'username' => 'taken-user',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'accountType' => 'organization',
            'name' => 'Dup User',
            'email' => 'dup@example.test',
            'username' => 'taken-user',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'category' => 'NGO',
            'partnerType' => 'Implementing Partner',
            'orgName' => 'Dup Org',
            'registrationNumber' => 'REG-1',
            'taxId' => 'TIN-1',
            'physicalAddress' => 'Addr',
            'sectors' => ['Renewable Energy'],
            'mission' => 'Mission',
            'description' => 'Desc',
            'expertise' => ['Research'],
            'contactName' => 'Contact',
            'contactPosition' => 'Pos',
            'contactEmail' => 'c@example.test',
            'contactPhone' => '123',
        ])->assertStatus(422);
    }

    public function test_pending_partner_cannot_login(): void
    {
        $this->makeUser('partner', User::STATUS_PENDING);
        $user = User::where('status', User::STATUS_PENDING)->first();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ])->assertStatus(422);
    }

    public function test_approved_partner_receives_a_token(): void
    {
        $user = $this->makeUser('partner');

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);
        $res->assertOk()->assertJsonStructure(['data', 'token']);
    }

    public function test_partner_submission_is_forced_pending(): void
    {
        $partner = $this->makeUser('partner');
        Sanctum::actingAs($partner, ['*']);

        $res = $this->postJson('/api/v1/projects', [
            'title' => 'Partner Project',
            'summary' => 'test',
            'published' => true, // must be ignored
        ]);

        $res->assertCreated();
        $this->assertEquals('pending', $res->json('data.workflowStatus'));
        $this->assertFalse($res->json('data.published'));
    }

    public function test_admin_can_create_a_user_who_can_then_log_in(): void
    {
        // Only roles in Roles::ALL are assignable; the legacy 'editor' the
        // rest of this suite uses is not one of them.
        Role::findOrCreate('knowledge-manager', 'web');

        $admin = $this->makeUser('super-admin');
        Sanctum::actingAs($admin, ['*']);

        $res = $this->postJson('/api/v1/users', [
            'name' => 'Created Staffer',
            'email' => 'created-staffer@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['knowledge-manager'],
        ]);

        $res->assertCreated();
        // Admin-created accounts are usable immediately — no second approval.
        $this->assertSame('approved', $res->json('data.status'));
        $this->assertSame(['knowledge-manager'], $res->json('data.roles'));

        // The password cast must not double-hash, or login silently breaks.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'created-staffer@example.test',
            'password' => 'secret123',
        ])->assertOk();
    }

    public function test_create_user_rejects_duplicate_email(): void
    {
        $admin = $this->makeUser('super-admin');
        Sanctum::actingAs($admin, ['*']);

        $this->postJson('/api/v1/users', [
            'name' => 'Dupe',
            'email' => $admin->email,
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['platform-admin'],
        ])->assertStatus(422);
    }

    public function test_partner_cannot_create_users(): void
    {
        Sanctum::actingAs($this->makeUser('partner'), ['*']);

        $this->postJson('/api/v1/users', [
            'name' => 'Sneaky',
            'email' => 'sneaky@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['super-admin'],
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'sneaky@example.test']);
    }

    public function test_platform_admin_cannot_mint_a_super_admin(): void
    {
        Role::findOrCreate('platform-admin', 'web');
        Sanctum::actingAs($this->makeUser('platform-admin'), ['*']);

        // A platform-admin manages users, so it clears `manage-users` — the
        // escalation guard, not the gate, is what must stop this.
        $this->postJson('/api/v1/users', [
            'name' => 'Escalated',
            'email' => 'escalated@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['super-admin'],
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'escalated@example.test']);
    }

    /** Build an organisation admin attached to a real partner record. */
    private function makePartnerAdmin(): User
    {
        foreach (\App\Support\Roles::PARTNER_TEAM_ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }
        $partner = \App\Models\Partner::create([
            'slug' => 'org-' . uniqid(),
            'name' => 'Test Organisation',
        ]);
        $admin = User::create([
            'name' => 'Org Admin',
            'email' => 'org-admin-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
            'partner_id' => $partner->id,
        ]);
        $admin->assignRole(\App\Support\Roles::PARTNER_ADMIN);

        return $admin;
    }

    public function test_partner_admin_creates_a_colleague_in_their_own_org(): void
    {
        $admin = $this->makePartnerAdmin();
        Sanctum::actingAs($admin, ['*']);

        $res = $this->postJson('/api/v1/partner-team', [
            'name' => 'Org Knowledge Person',
            'email' => 'org-km@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['partner-knowledge-manager'],
        ]);

        $res->assertCreated();
        // Attached to the admin's organisation, not one of their choosing.
        $this->assertDatabaseHas('users', [
            'email' => 'org-km@example.test',
            'partner_id' => $admin->partner_id,
        ]);
    }

    public function test_partner_admin_cannot_grant_platform_wide_roles(): void
    {
        $admin = $this->makePartnerAdmin();
        Sanctum::actingAs($admin, ['*']);

        // The whole point of the separate slugs: an external organisation
        // must not be able to mint a site-wide publisher or reviewer.
        foreach (['knowledge-manager', 'content-contributor', 'platform-admin', 'super-admin'] as $role) {
            $this->postJson('/api/v1/partner-team', [
                'name' => 'Escalated',
                'email' => "escalate-{$role}@example.test",
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
                'roles' => [$role],
            ])->assertStatus(422);

            $this->assertDatabaseMissing('users', ['email' => "escalate-{$role}@example.test"]);
        }
    }

    public function test_partner_admin_cannot_plant_a_user_in_another_org(): void
    {
        $admin = $this->makePartnerAdmin();
        $otherOrg = \App\Models\Partner::create(['slug' => 'other-org', 'name' => 'Other Org']);
        Sanctum::actingAs($admin, ['*']);

        $this->postJson('/api/v1/partner-team', [
            'name' => 'Planted',
            'email' => 'planted@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['partner-content-contributor'],
            // Ignored: partner_id comes from the session, not the payload.
            'partner_id' => $otherOrg->id,
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'planted@example.test',
            'partner_id' => $admin->partner_id,
        ]);
    }

    public function test_partner_team_is_scoped_to_the_callers_org(): void
    {
        $adminA = $this->makePartnerAdmin();
        $adminB = $this->makePartnerAdmin();

        Sanctum::actingAs($adminA, ['*']);
        $this->postJson('/api/v1/partner-team', [
            'name' => 'A Colleague',
            'email' => 'a-colleague@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['partner-content-contributor'],
        ])->assertCreated();

        // B must not see A's organisation at all.
        Sanctum::actingAs($adminB, ['*']);
        $emails = collect($this->getJson('/api/v1/partner-team')->json('data'))->pluck('email');
        $this->assertNotContains('a-colleague@example.test', $emails);
        $this->assertContains($adminB->email, $emails);
    }

    public function test_plain_partner_cannot_manage_a_team(): void
    {
        Sanctum::actingAs($this->makeUser('partner'), ['*']);

        $this->getJson('/api/v1/partner-team')->assertForbidden();
        $this->postJson('/api/v1/partner-team', [
            'name' => 'Nope',
            'email' => 'nope@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['partner-content-contributor'],
        ])->assertForbidden();
    }

    public function test_partner_admin_cannot_reach_platform_user_management(): void
    {
        Sanctum::actingAs($this->makePartnerAdmin(), ['*']);

        // Organisation admin is not platform admin.
        $this->getJson('/api/v1/users')->assertForbidden();
        $this->postJson('/api/v1/users', [
            'name' => 'Staff',
            'email' => 'staff@example.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'roles' => ['knowledge-manager'],
        ])->assertForbidden();
    }

    public function test_partner_cannot_manage_users(): void
    {
        $partner = $this->makeUser('partner');
        Sanctum::actingAs($partner, ['*']);

        $this->getJson('/api/v1/users')->assertForbidden();
    }

    public function test_reviewer_approve_publishes_and_audits(): void
    {
        $partner = $this->makeUser('partner');
        $reviewer = $this->makeUser('reviewer');

        Sanctum::actingAs($partner, ['*']);
        $this->postJson('/api/v1/projects', ['title' => 'To Approve', 'summary' => 'x']);
        $slug = Project::where('title', 'To Approve')->first()->slug;

        Sanctum::actingAs($reviewer, ['*']);
        $res = $this->postJson("/api/v1/projects/{$slug}/approve");
        $res->assertOk();

        $this->assertTrue(Project::where('slug', $slug)->first()->published);
        $this->assertDatabaseHas('activity_log', ['event' => 'approved']);
    }

    public function test_staff_admin_flag_sees_drafts_partner_does_not(): void
    {
        $this->publishedProject();
        Project::create(['slug' => 'd1', 'title' => 'Draft', 'published' => false, 'workflow_status' => 'draft']);

        $editor = $this->makeUser('editor');
        $partner = $this->makeUser('partner');

        Sanctum::actingAs($editor, ['*']);
        $this->assertEquals(2, $this->getJson('/api/v1/projects?admin=true')->json('total'));

        Sanctum::actingAs($partner, ['*']);
        $this->assertEquals(1, $this->getJson('/api/v1/projects?admin=true')->json('total'));
    }

    public function test_search_returns_ranked_results(): void
    {
        $this->publishedProject(['title' => 'Solar Water Pumping', 'summary' => 'solar solar solar']);
        $this->publishedProject(['title' => 'Biogas Digester', 'summary' => 'methane']);

        $res = $this->getJson('/api/v1/search?q=solar');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, $res->json('total'));
        $this->assertEquals('Solar Water Pumping', $res->json('data.0.title'));
    }

    public function test_analytics_requires_staff(): void
    {
        $partner = $this->makeUser('partner');
        Sanctum::actingAs($partner, ['*']);
        $this->getJson('/api/v1/analytics/overview')->assertForbidden();

        $admin = $this->makeUser('super-admin');
        Sanctum::actingAs($admin, ['*']);
        $this->getJson('/api/v1/analytics/overview')->assertOk();
    }

    /**
     * Uploads must check approval, not just authentication. The static build
     * ships the admin bundle to anyone, so `auth:sanctum` alone is not a guard.
     */
    public function test_media_upload_requires_an_approved_contributor(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->image('logo.png');

        $pending = $this->makeUser('partner', User::STATUS_PENDING);
        Sanctum::actingAs($pending, ['*']);
        $this->postJson('/api/v1/media', ['file' => $file, 'kind' => 'image'])
            ->assertForbidden();

        $approved = $this->makeUser('partner');
        Sanctum::actingAs($approved, ['*']);
        $this->postJson('/api/v1/media', ['file' => $file, 'kind' => 'image'])
            ->assertCreated();
    }

    /**
     * An SVG is executable markup. Served from /storage on the same origin
     * as the app, a crafted one could read the admin's token, so uploads
     * must reject it outright rather than rely on the kind check.
     */
    public function test_svg_upload_is_rejected(): void
    {
        Storage::fake('public');
        $approved = $this->makeUser('editor');
        Sanctum::actingAs($approved, ['*']);

        $svg = UploadedFile::fake()->createWithContent(
            'payload.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        );

        $this->postJson('/api/v1/media', ['file' => $svg, 'kind' => 'image'])
            ->assertStatus(422);

        // Also rejected when smuggled through the document path.
        $this->postJson('/api/v1/media', ['file' => $svg, 'kind' => 'document'])
            ->assertStatus(422);
    }
}
