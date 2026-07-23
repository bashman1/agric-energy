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
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'category' => 'Non-Governmental Organization (NGO)',
            'orgName' => 'Green Energy Uganda',
            'contactEmail' => 'contact@greenenergy.test',
            'sectors' => ['Renewable Energy', 'Agriculture'],
            'valueChains' => ['Coffee', 'Maize'],
            'coverageScope' => ['National'],
            'expertise' => ['Research'],
        ]);

        $res->assertCreated();

        $partner = \App\Models\Partner::where('name', 'Green Energy Uganda')->first();
        $this->assertNotNull($partner);
        $this->assertFalse((bool) $partner->published);
        $this->assertEquals('pending', $partner->workflow_status);
        $this->assertEquals(['Renewable Energy', 'Agriculture'], $partner->sectors);
        $this->assertEquals('Non-Governmental Organization (NGO)', $partner->category);

        $user = User::where('email', 'admin@greenenergy.test')->first();
        $this->assertEquals('organization', $user->account_type);
        $this->assertEquals($partner->id, $user->partner_id);
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
