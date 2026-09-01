<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\Project;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * The organisation-level sign-off stage: an organisation vouches for its own
 * members' submissions before NREP is asked to review them.
 *
 * Two properties matter throughout and each has a test below:
 *
 *  - it is a stage BEFORE the platform queue, never a replacement for it. An
 *    endorsed project is not published, and it does not become published
 *    until a platform reviewer says so;
 *  - it is scoped to one organisation, and nobody signs off their own work.
 */
class OrganisationApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    private function makeUser(string $role, ?int $partnerId = null): User
    {
        $user = User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
            'partner_id' => $partnerId,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function org(string $name = 'Test Org'): Partner
    {
        return Partner::create([
            'slug' => 'org-' . uniqid(),
            'name' => $name,
            'entity_kind' => 'organization',
            'published' => true,
            'workflow_status' => 'published',
        ]);
    }

    /** @return array{Partner, User, User} org, its admin, its contributor */
    private function orgWithAdminAndContributor(): array
    {
        $org = $this->org();
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        $contributor = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        return [$org, $admin, $contributor];
    }

    private function submitProject(User $as, string $title = 'Solar Irrigation Pilot'): array
    {
        Sanctum::actingAs($as, ['*']);

        return $this->postJson('/api/v1/projects', [
            'title' => $title,
            'summary' => 'A pilot deploying solar irrigation pumps.',
            'region' => 'Central Uganda',
        ])->assertCreated()->json('data');
    }

    // ── Where a submission lands ──────────────────────────────────────

    public function test_a_contributors_submission_waits_for_their_own_organisation(): void
    {
        [, , $contributor] = $this->orgWithAdminAndContributor();

        $data = $this->submitProject($contributor);

        $this->assertSame(Project::STATUS_ORG_PENDING, $data['workflowStatus']);
        $this->assertFalse($data['published']);
    }

    public function test_an_org_pending_submission_is_absent_from_the_platform_queue(): void
    {
        [, , $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor);

        $reviewer = $this->makeUser(Roles::REVIEWER);
        Sanctum::actingAs($reviewer, ['*']);

        $this->getJson('/api/v1/review/queue')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_an_organisation_admins_own_submission_skips_the_stage(): void
    {
        [, $admin] = $this->orgWithAdminAndContributor();

        $data = $this->submitProject($admin);

        // Nobody else in the organisation could sign it off, so parking it at
        // org_pending would strand it.
        $this->assertSame(Project::STATUS_PENDING, $data['workflowStatus']);
    }

    public function test_a_contributor_with_no_org_admin_goes_straight_to_the_platform(): void
    {
        $org = $this->org('Adminless Org');
        $contributor = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        $data = $this->submitProject($contributor);

        $this->assertSame(Project::STATUS_PENDING, $data['workflowStatus']);
    }

    public function test_a_staff_contributor_is_unaffected(): void
    {
        $staff = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);

        $data = $this->submitProject($staff);

        $this->assertSame(Project::STATUS_PENDING, $data['workflowStatus']);
    }

    // ── The organisation queue ────────────────────────────────────────

    public function test_the_org_queue_shows_only_the_callers_organisation(): void
    {
        [, $admin, $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor, 'Ours');

        [, , $otherContributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($otherContributor, 'Theirs');

        Sanctum::actingAs($admin, ['*']);

        $this->getJson('/api/v1/review/org-queue')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.title', 'Ours');
    }

    public function test_a_contributor_cannot_open_the_org_queue(): void
    {
        [, , $contributor] = $this->orgWithAdminAndContributor();
        Sanctum::actingAs($contributor, ['*']);

        $this->getJson('/api/v1/review/org-queue')->assertForbidden();
    }

    // ── Endorsing and returning ───────────────────────────────────────

    public function test_endorsement_sends_it_to_the_platform_without_publishing_it(): void
    {
        [, $admin, $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor);
        $slug = Project::first()->slug;

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/v1/projects/{$slug}/org-approve")
            ->assertOk()
            ->assertJsonPath('data.workflowStatus', Project::STATUS_PENDING)
            ->assertJsonPath('data.published', false);

        // …and now, and only now, a platform reviewer can see it.
        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);
        $this->getJson('/api/v1/review/queue')->assertJsonPath('total', 1);
    }

    public function test_returning_it_needs_notes_and_never_reaches_the_platform(): void
    {
        [, $admin, $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor);
        $slug = Project::first()->slug;

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/v1/projects/{$slug}/org-return", [])
            ->assertStatus(422);

        $this->postJson("/api/v1/projects/{$slug}/org-return", ['notes' => 'Add the budget figures.'])
            ->assertOk()
            ->assertJsonPath('data.workflowStatus', Project::STATUS_REJECTED)
            ->assertJsonPath('data.reviewNotes', 'Add the budget figures.');

        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);
        $this->getJson('/api/v1/review/queue')->assertJsonPath('total', 0);
    }

    public function test_an_admin_cannot_endorse_another_organisations_submission(): void
    {
        [, , $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor);
        $slug = Project::first()->slug;

        [, $otherAdmin] = $this->orgWithAdminAndContributor();
        Sanctum::actingAs($otherAdmin, ['*']);

        $this->postJson("/api/v1/projects/{$slug}/org-approve")->assertForbidden();
    }

    public function test_an_admin_cannot_endorse_their_own_submission(): void
    {
        $org = $this->org();
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        // A second admin exists, so the first one's work COULD have been
        // parked here; the rule under test is the self-approval refusal, not
        // where the record was routed.
        $this->makeUser(Roles::PARTNER_ADMIN, $org->id);

        $project = Project::create([
            'slug' => 'own-work',
            'title' => 'Own Work',
            'summary' => 'Written by the admin.',
            'published' => false,
            'workflow_status' => Project::STATUS_ORG_PENDING,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->postJson("/api/v1/projects/{$project->slug}/org-approve")->assertForbidden();
    }

    public function test_an_admin_cannot_endorse_a_record_the_platform_already_holds(): void
    {
        [, $admin, $contributor] = $this->orgWithAdminAndContributor();

        $project = Project::create([
            'slug' => 'already-live',
            'title' => 'Already Live',
            'summary' => 'Published long ago.',
            'published' => true,
            'workflow_status' => Project::STATUS_PUBLISHED,
            'created_by' => $contributor->id,
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->postJson("/api/v1/projects/{$project->slug}/org-approve")->assertForbidden();
    }

    // ── What the author sees ──────────────────────────────────────────

    public function test_the_author_still_sees_their_submission_while_it_waits(): void
    {
        [, , $contributor] = $this->orgWithAdminAndContributor();
        $this->submitProject($contributor);

        Sanctum::actingAs($contributor, ['*']);

        $this->getJson('/api/v1/my/content')
            ->assertOk()
            ->assertJsonPath('data.0.workflowStatus', Project::STATUS_ORG_PENDING);
    }
}
