<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Acting on several records at once from the admin list tables.
 *
 * The guarantee under test is that a bulk action is the single-record action
 * repeated, never a cheaper version of it:
 *
 *  - every record in the batch is authorised on its own, so a selection that
 *    mixes what the caller may touch with what they may not goes through in
 *    part rather than failing whole. The response names the refusals;
 *  - the editorial rules survive the shortcut. Publishing a record that is
 *    sitting in a review queue is an approval, so the author of a queued
 *    submission cannot clear it from the list view any more than they could
 *    from the review queue. A plain draft is not a submission and is not
 *    caught by that;
 *  - a bulk publish is audited exactly as an approval is.
 */
class BulkActionTest extends TestCase
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

    private function project(string $slug, string $status, bool $published, ?User $author = null): Project
    {
        return Project::create([
            'slug' => $slug,
            'title' => ucfirst(str_replace('-', ' ', $slug)),
            'summary' => 'A pilot deploying solar irrigation pumps.',
            'published' => $published,
            'workflow_status' => $status,
            'created_by' => $author?->id,
        ]);
    }

    private function bulk(string $action, array $slugs, string $type = 'projects')
    {
        return $this->postJson("/api/v1/bulk/{$type}", [
            'action' => $action,
            'slugs' => $slugs,
        ]);
    }

    // ── The happy paths ───────────────────────────────────────────────

    public function test_a_content_manager_bulk_publishes_drafts(): void
    {
        $this->project('draft-one', Project::STATUS_DRAFT, false);
        $this->project('draft-two', Project::STATUS_DRAFT, false);

        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->bulk('publish', ['draft-one', 'draft-two'])
            ->assertOk()
            ->assertJsonPath('data.action', 'publish')
            ->assertJsonPath('data.type', 'projects')
            ->assertJsonPath('data.succeeded', ['draft-one', 'draft-two'])
            ->assertJsonPath('data.failed', []);

        foreach (['draft-one', 'draft-two'] as $slug) {
            $project = Project::where('slug', $slug)->first();
            // The flag and the workflow status move together, or the review
            // queue keeps listing a record the public is already reading.
            $this->assertTrue((bool) $project->published);
            $this->assertSame(Project::STATUS_PUBLISHED, $project->workflow_status);
        }
    }

    public function test_a_content_manager_bulk_unpublishes_live_records(): void
    {
        $this->project('live-one', Project::STATUS_PUBLISHED, true);
        $this->project('live-two', Project::STATUS_PUBLISHED, true);

        Sanctum::actingAs($this->makeUser(Roles::PLATFORM_ADMIN), ['*']);

        $this->bulk('unpublish', ['live-one', 'live-two'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['live-one', 'live-two'])
            ->assertJsonPath('data.failed', []);

        foreach (['live-one', 'live-two'] as $slug) {
            $project = Project::where('slug', $slug)->first();
            $this->assertFalse((bool) $project->published);
            // Back to a draft, not `rejected`: taking a record off the site is
            // a decision about timing, not a judgement on the author.
            $this->assertSame(Project::STATUS_DRAFT, $project->workflow_status);
        }
    }

    public function test_a_content_manager_bulk_deletes(): void
    {
        $this->project('doomed-one', Project::STATUS_PUBLISHED, true);
        $this->project('doomed-two', Project::STATUS_DRAFT, false);

        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->bulk('delete', ['doomed-one', 'doomed-two'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['doomed-one', 'doomed-two'])
            ->assertJsonPath('data.failed', []);

        $this->assertDatabaseMissing('projects', ['slug' => 'doomed-one']);
        $this->assertDatabaseMissing('projects', ['slug' => 'doomed-two']);
    }

    // ── Separation of duties ──────────────────────────────────────────

    public static function queuedStatuses(): array
    {
        return [
            'awaiting the organisation' => [Project::STATUS_ORG_PENDING],
            'awaiting the platform' => [Project::STATUS_PENDING],
            'being reviewed' => [Project::STATUS_IN_REVIEW],
        ];
    }

    #[DataProvider('queuedStatuses')]
    public function test_a_knowledge_manager_cannot_bulk_publish_their_own_queued_submission(string $status): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->project('my-submission', $status, false, $km);

        Sanctum::actingAs($km, ['*']);

        $this->bulk('publish', ['my-submission'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', [])
            ->assertJsonPath('data.failed.0.slug', 'my-submission')
            ->assertJsonPath(
                'data.failed.0.reason',
                'It is awaiting review and you submitted it — someone else has to approve it.'
            );

        // The point of the refusal: the record did not go live anyway.
        $project = Project::where('slug', 'my-submission')->first();
        $this->assertFalse((bool) $project->published);
        $this->assertSame($status, $project->workflow_status);
    }

    public function test_a_knowledge_manager_may_publish_a_queued_submission_somebody_else_wrote(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $this->project('their-submission', Project::STATUS_PENDING, false, $author);

        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->bulk('publish', ['their-submission'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['their-submission'])
            ->assertJsonPath('data.failed', []);

        $this->assertTrue((bool) Project::where('slug', 'their-submission')->first()->published);
    }

    public function test_a_knowledge_manager_may_publish_their_own_plain_draft(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->project('my-draft', Project::STATUS_DRAFT, false, $km);

        Sanctum::actingAs($km, ['*']);

        // A draft was never submitted to anyone, so clearing it is not an
        // approval and the second-pair-of-eyes rule has nothing to say.
        $this->bulk('publish', ['my-draft'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['my-draft'])
            ->assertJsonPath('data.failed', []);

        $this->assertTrue((bool) Project::where('slug', 'my-draft')->first()->published);
    }

    public function test_a_super_admin_may_publish_their_own_queued_submission(): void
    {
        $admin = $this->makeUser(Roles::SUPER_ADMIN);
        $this->project('admin-submission', Project::STATUS_PENDING, false, $admin);

        Sanctum::actingAs($admin, ['*']);

        // Deliberate: Gate::before() lets a super-admin unblock a stuck queue.
        $this->bulk('publish', ['admin-submission'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['admin-submission'])
            ->assertJsonPath('data.failed', []);

        $this->assertTrue((bool) Project::where('slug', 'admin-submission')->first()->published);
    }

    // ── Who may publish at all ────────────────────────────────────────

    public function test_a_contributor_cannot_bulk_publish_or_unpublish(): void
    {
        $contributor = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $this->project('their-draft', Project::STATUS_DRAFT, false, $contributor);
        $this->project('their-live', Project::STATUS_PUBLISHED, true, $contributor);

        Sanctum::actingAs($contributor, ['*']);

        $this->bulk('publish', ['their-draft'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', [])
            ->assertJsonPath('data.failed.0.reason', 'Publishing is a content-manager action.');

        $this->bulk('unpublish', ['their-live'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', [])
            ->assertJsonPath('data.failed.0.reason', 'Publishing is a content-manager action.');

        $this->assertFalse((bool) Project::where('slug', 'their-draft')->first()->published);
        $this->assertTrue((bool) Project::where('slug', 'their-live')->first()->published);
    }

    public function test_a_partner_cannot_bulk_publish_their_own_submission(): void
    {
        $partner = $this->makeUser(Roles::PARTNER);
        $this->project('partner-submission', Project::STATUS_PENDING, false, $partner);

        Sanctum::actingAs($partner, ['*']);

        $this->bulk('publish', ['partner-submission'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', [])
            ->assertJsonPath('data.failed.0.reason', 'Publishing is a content-manager action.');

        $this->assertFalse((bool) Project::where('slug', 'partner-submission')->first()->published);
    }

    // ── Partial success ───────────────────────────────────────────────

    public function test_one_request_can_both_succeed_and_be_refused(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);

        $this->project('allowed', Project::STATUS_PENDING, false, $author);
        $this->project('refused', Project::STATUS_PENDING, false, $km);

        Sanctum::actingAs($km, ['*']);

        // Twenty selected rows routinely include one the caller may not touch;
        // refusing the whole batch would teach people to tick one row at a time.
        $this->bulk('publish', ['allowed', 'refused'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['allowed'])
            ->assertJsonPath('data.failed.0.slug', 'refused');

        $this->assertTrue((bool) Project::where('slug', 'allowed')->first()->published);
        $this->assertFalse((bool) Project::where('slug', 'refused')->first()->published);
    }

    // ── Slugs that are not there ──────────────────────────────────────

    public function test_a_missing_slug_fails_a_publish(): void
    {
        $this->project('real-draft', Project::STATUS_DRAFT, false);

        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->bulk('publish', ['real-draft', 'ghost'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['real-draft'])
            ->assertJsonPath('data.failed.0.slug', 'ghost')
            ->assertJsonPath('data.failed.0.reason', 'No longer exists.');
    }

    public function test_a_missing_slug_satisfies_a_delete(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        // Already gone is the outcome the delete was asking for, so it is not
        // a failure the caller has to do anything about.
        $this->bulk('delete', ['ghost'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['ghost'])
            ->assertJsonPath('data.failed', []);
    }

    // ── A contributor deleting their own work ─────────────────────────

    public function test_a_contributor_deletes_their_own_draft_but_not_their_live_record(): void
    {
        $contributor = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $this->project('mine-draft', Project::STATUS_DRAFT, false, $contributor);
        $this->project('mine-live', Project::STATUS_PUBLISHED, true, $contributor);

        Sanctum::actingAs($contributor, ['*']);

        $this->bulk('delete', ['mine-draft', 'mine-live'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', ['mine-draft'])
            ->assertJsonPath('data.failed.0.slug', 'mine-live')
            ->assertJsonPath(
                'data.failed.0.reason',
                'It is live — a published record can only be deleted by a content manager.'
            );

        $this->assertDatabaseMissing('projects', ['slug' => 'mine-draft']);
        $this->assertDatabaseHas('projects', ['slug' => 'mine-live']);
    }

    public function test_a_contributor_cannot_delete_somebody_elses_draft(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $this->project('not-mine', Project::STATUS_DRAFT, false, $author);

        Sanctum::actingAs($this->makeUser(Roles::CONTENT_CONTRIBUTOR), ['*']);

        $this->bulk('delete', ['not-mine'])
            ->assertOk()
            ->assertJsonPath('data.succeeded', [])
            ->assertJsonPath('data.failed.0.reason', 'You do not have permission to delete it.');

        $this->assertDatabaseHas('projects', ['slug' => 'not-mine']);
    }

    // ── The audit trail ───────────────────────────────────────────────

    public function test_a_bulk_publish_is_audited_like_an_approval(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $this->project('to-audit', Project::STATUS_PENDING, false, $author);

        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        Sanctum::actingAs($km, ['*']);

        $this->bulk('publish', ['to-audit'])->assertOk();

        // Same event name a single-record approval writes, so the audit view
        // does not have to know which screen the decision was taken from.
        $this->assertDatabaseHas('activity_log', [
            'event' => 'approved',
            'description' => 'Published in a bulk action',
            'causer_id' => $km->id,
        ]);
    }

    public function test_a_refused_publish_writes_no_audit_entry(): void
    {
        $km = $this->makeUser(Roles::KNOWLEDGE_MANAGER);
        $this->project('refused-audit', Project::STATUS_PENDING, false, $km);

        Sanctum::actingAs($km, ['*']);
        $this->bulk('publish', ['refused-audit'])->assertOk();

        $this->assertDatabaseMissing('activity_log', ['description' => 'Published in a bulk action']);
    }

    // ── The envelope ──────────────────────────────────────────────────

    public function test_an_unknown_content_type_is_a_404(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->bulk('publish', ['anything'], 'widgets')->assertNotFound();
    }

    public function test_every_known_content_type_is_addressable(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        foreach (['projects', 'technologies', 'themes', 'partners', 'resources',
            'events', 'opportunities', 'policies', 'posts'] as $type) {
            $this->bulk('publish', ['nothing-by-this-name'], $type)
                ->assertOk()
                ->assertJsonPath('data.type', $type);
        }
    }

    public function test_the_action_and_the_slugs_are_validated(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::KNOWLEDGE_MANAGER), ['*']);

        $this->postJson('/api/v1/bulk/projects', ['action' => 'archive', 'slugs' => ['a']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['action']);

        $this->postJson('/api/v1/bulk/projects', ['action' => 'publish', 'slugs' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['slugs']);

        $this->postJson('/api/v1/bulk/projects', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['action', 'slugs']);
    }

    public function test_bulk_actions_require_authentication(): void
    {
        $this->project('live-one', Project::STATUS_PUBLISHED, true);

        $this->postJson('/api/v1/bulk/projects', [
            'action' => 'delete',
            'slugs' => ['live-one'],
        ])->assertUnauthorized();

        $this->assertDatabaseHas('projects', ['slug' => 'live-one']);
    }
}
