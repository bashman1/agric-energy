<?php

namespace Tests\Feature;

use App\Models\ContentRevision;
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
 * Being able to READ what you are being asked to approve.
 *
 * Both sign-off gates could act on a submission without showing it. At the
 * organisation gate the queue offered a title and two buttons, and the API had
 * no endpoint that would return a colleague's unpublished record at all. At the
 * platform gate the `reviewer` role — the one whose entire job is reviewing —
 * was excluded from the admin read flag, so it could list the queue and read
 * nothing in it. A queued EDIT was worse again: approving it changes a live
 * record, and the only thing on offer was the names of the fields it touched.
 *
 * These tests pin the read paths open, and pin the limits that go with them:
 * an organisation still sees only its own work, an author still cannot review
 * their own, and a plain partner account gets none of it.
 */
class ReviewVisibilityTest extends TestCase
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

    private function submitProject(User $as, string $title = 'Solar Irrigation Pilot'): array
    {
        Sanctum::actingAs($as, ['*']);

        return $this->postJson('/api/v1/projects', [
            'title' => $title,
            'summary' => 'A pilot deploying solar irrigation pumps.',
            'region' => 'Central Uganda',
        ])->assertCreated()->json('data');
    }

    // ── The organisation gate ─────────────────────────────────────────

    public function test_an_org_knowledge_manager_can_work_the_org_queue(): void
    {
        $org = $this->org();
        $km = $this->makeUser(Roles::PARTNER_KNOWLEDGE_MANAGER, $org->id);
        $contributor = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        $this->submitProject($contributor);

        Sanctum::actingAs($km, ['*']);
        $this->getJson('/api/v1/review/org-queue')
            ->assertOk()
            ->assertJsonPath('total', 1);
    }

    public function test_an_org_knowledge_manager_can_endorse_a_colleagues_submission(): void
    {
        $org = $this->org();
        $km = $this->makeUser(Roles::PARTNER_KNOWLEDGE_MANAGER, $org->id);
        $contributor = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        $slug = $this->submitProject($contributor)['slug'];

        Sanctum::actingAs($km, ['*']);
        $this->postJson("/api/v1/projects/{$slug}/org-approve")->assertOk();

        $project = Project::where('slug', $slug)->first();

        // Endorsed onward to NREP, and still not public — the two gates stay
        // distinct however wide the first one's membership is.
        $this->assertSame(Project::STATUS_PENDING, $project->workflow_status);
        $this->assertFalse((bool) $project->published);
    }

    public function test_an_org_reviewer_reads_a_colleagues_submission_in_full(): void
    {
        $org = $this->org();
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        $contributor = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        $slug = $this->submitProject($contributor)['slug'];

        Sanctum::actingAs($admin, ['*']);
        $this->getJson("/api/v1/my/content/projects/{$slug}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Solar Irrigation Pilot')
            ->assertJsonPath('data.summary', 'A pilot deploying solar irrigation pumps.')
            ->assertJsonPath('data.isMine', false);
    }

    public function test_another_organisations_submission_is_not_readable(): void
    {
        $orgA = $this->org('Org A');
        $orgB = $this->org('Org B');

        $theirs = $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $orgA->id);
        $slug = $this->submitProject($theirs)['slug'];

        $outsider = $this->makeUser(Roles::PARTNER_ADMIN, $orgB->id);
        Sanctum::actingAs($outsider, ['*']);

        // 404, not 403: whether another organisation has a draft by this name
        // is not information this caller is entitled to either.
        $this->getJson("/api/v1/my/content/projects/{$slug}")->assertNotFound();
    }

    public function test_an_org_admins_submission_is_now_checked_by_the_knowledge_manager(): void
    {
        $org = $this->org();
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        $this->makeUser(Roles::PARTNER_KNOWLEDGE_MANAGER, $org->id);

        $data = $this->submitProject($admin);

        // Previously this skipped organisational review entirely, because the
        // administrator was assumed to be the only person who could sign off.
        $this->assertSame(Project::STATUS_ORG_PENDING, $data['workflowStatus']);
    }

    public function test_an_org_admin_alone_still_skips_the_stage(): void
    {
        $org = $this->org();
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        $this->makeUser(Roles::PARTNER_CONTENT_CONTRIBUTOR, $org->id);

        $data = $this->submitProject($admin);

        // Nobody else may endorse, so parking it would strand it.
        $this->assertSame(Project::STATUS_PENDING, $data['workflowStatus']);
    }

    // ── The platform gate ─────────────────────────────────────────────

    public function test_a_platform_reviewer_can_read_an_unpublished_record(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $slug = $this->submitProject($author)['slug'];

        $reviewer = $this->makeUser(Roles::REVIEWER);
        Sanctum::actingAs($reviewer, ['*']);

        $this->getJson("/api/v1/projects/{$slug}?admin=true")
            ->assertOk()
            ->assertJsonPath('data.title', 'Solar Irrigation Pilot');
    }

    public function test_a_partner_still_cannot_read_other_drafts_via_the_admin_flag(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $slug = $this->submitProject($author)['slug'];

        $outsider = $this->makeUser(Roles::PARTNER);
        Sanctum::actingAs($outsider, ['*']);

        // Widening the flag to reviewers must not have widened it to everyone.
        $this->getJson("/api/v1/projects/{$slug}?admin=true")->assertNotFound();
    }

    // ── A queued edit to a live record ────────────────────────────────

    /** @return array{Project, ContentRevision, User} */
    private function liveProjectWithQueuedEdit(): array
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);

        $project = Project::create([
            'slug' => 'live-project',
            'title' => 'Original Title',
            'summary' => 'Original summary',
            'published' => true,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', [
            'title' => 'Revised Title',
            'summary' => 'Revised summary',
        ])->assertStatus(202);

        return [$project, ContentRevision::pending()->firstOrFail(), $author];
    }

    public function test_a_queued_edit_reads_as_before_and_after(): void
    {
        [, $revision] = $this->liveProjectWithQueuedEdit();

        $reviewer = $this->makeUser(Roles::REVIEWER);
        Sanctum::actingAs($reviewer, ['*']);

        $changes = $this->getJson("/api/v1/revisions/{$revision->id}")
            ->assertOk()
            ->assertJsonPath('data.kind', 'revision')
            ->assertJsonPath('data.type', 'projects')
            ->json('data.changes');

        $byField = collect($changes)->keyBy('field');

        // Both halves matter: the proposed value alone does not tell a
        // reviewer what it displaces.
        $this->assertSame('Original Title', $byField['title']['before']);
        $this->assertSame('Revised Title', $byField['title']['after']);
        $this->assertSame('Original summary', $byField['summary']['before']);
        $this->assertSame('Revised summary', $byField['summary']['after']);
    }

    public function test_reading_a_queued_edit_does_not_apply_it(): void
    {
        [$project, $revision] = $this->liveProjectWithQueuedEdit();

        $reviewer = $this->makeUser(Roles::REVIEWER);
        Sanctum::actingAs($reviewer, ['*']);
        $this->getJson("/api/v1/revisions/{$revision->id}")->assertOk();

        $project->refresh();
        $this->assertSame('Original Title', $project->title);
        $this->assertTrue((bool) $project->published);
        $this->assertSame(ContentRevision::STATUS_PENDING, $revision->fresh()->status);
    }

    public function test_an_author_cannot_open_their_own_queued_edit_for_review(): void
    {
        [, $revision, $author] = $this->liveProjectWithQueuedEdit();

        Sanctum::actingAs($author, ['*']);

        // Same rule as approving it: the read is gated on `review`, so a route
        // to inspect a record cannot become a way around separation of duties.
        $this->getJson("/api/v1/revisions/{$revision->id}")->assertForbidden();
    }
}
