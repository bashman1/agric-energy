<?php

namespace Tests\Feature;

use App\Models\ContentRevision;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Resource;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * What a contributor can maintain for themselves, and what stays a reviewer's
 * decision: editing live records, keeping a directory profile current, sharing
 * an organisation's submissions with colleagues, and restricting a file.
 */
class ContributorSelfServiceTest extends TestCase
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

    // ── Editing a live record ─────────────────────────────────────────

    public function test_editing_a_published_record_queues_a_revision_and_leaves_it_live(): void
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

        $res = $this->putJson('/api/v1/projects/live-project', [
            'title' => 'Revised Title',
            'summary' => 'Revised summary',
        ]);

        // Accepted, not applied.
        $res->assertStatus(202)->assertJsonPath('revision.status', 'pending');

        // The public still sees exactly what it saw before. This is the whole
        // point: the alternative — unpublishing on edit — takes a live record
        // off a national platform because someone fixed a typo.
        $project->refresh();
        $this->assertEquals('Original Title', $project->title);
        $this->assertTrue((bool) $project->published);

        $revision = ContentRevision::pending()->first();
        $this->assertNotNull($revision);
        $this->assertEquals('Revised Title', $revision->payload['title']);
    }

    public function test_approving_a_revision_applies_it(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $project = Project::create([
            'slug' => 'live-project',
            'title' => 'Original Title',
            'published' => true,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', ['title' => 'Revised Title'])
            ->assertStatus(202);

        $revision = ContentRevision::pending()->firstOrFail();

        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);
        $this->postJson("/api/v1/revisions/{$revision->id}/approve")->assertOk();

        $this->assertEquals('Revised Title', $project->fresh()->title);
        $this->assertEquals(ContentRevision::STATUS_APPROVED, $revision->fresh()->status);
        // Still published throughout — it never left the site.
        $this->assertTrue((bool) $project->fresh()->published);
    }

    public function test_rejecting_a_revision_discards_it_and_leaves_the_record_alone(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        $project = Project::create([
            'slug' => 'live-project',
            'title' => 'Original Title',
            'published' => true,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', ['title' => 'Revised Title'])
            ->assertStatus(202);

        $revision = ContentRevision::pending()->firstOrFail();

        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);
        $this->postJson("/api/v1/revisions/{$revision->id}/reject", [
            'notes' => 'The new title is less clear than the old one.',
        ])->assertOk();

        $this->assertEquals('Original Title', $project->fresh()->title);
        $this->assertEquals(ContentRevision::STATUS_REJECTED, $revision->fresh()->status);
    }

    public function test_a_second_edit_supersedes_the_pending_one(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        Project::create([
            'slug' => 'live-project',
            'title' => 'Original',
            'published' => true,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', ['title' => 'First go'])->assertStatus(202);
        $this->putJson('/api/v1/projects/live-project', ['title' => 'Second go'])->assertStatus(202);

        // One thing for a reviewer to decide on, not a queue of drafts.
        $this->assertEquals(1, ContentRevision::pending()->count());
        $this->assertEquals('Second go', ContentRevision::pending()->first()->payload['title']);
    }

    public function test_a_revision_cannot_smuggle_in_publication_state(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        Project::create([
            'slug' => 'live-project',
            'title' => 'Original',
            'published' => true,
            'featured' => false,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', [
            'title' => 'Revised',
            'featured' => true,
            'published' => true,
        ])->assertStatus(202);

        $payload = ContentRevision::pending()->first()->payload;
        $this->assertArrayNotHasKey('featured', $payload);
        $this->assertArrayNotHasKey('published', $payload);
    }

    public function test_the_review_queue_lists_pending_revisions(): void
    {
        $author = $this->makeUser(Roles::CONTENT_CONTRIBUTOR);
        Project::create([
            'slug' => 'live-project',
            'title' => 'Live One',
            'published' => true,
            'workflow_status' => 'published',
            'created_by' => $author->id,
        ]);

        Sanctum::actingAs($author, ['*']);
        $this->putJson('/api/v1/projects/live-project', ['title' => 'Edited'])->assertStatus(202);

        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);
        $res = $this->getJson('/api/v1/review/queue')->assertOk();

        $revisions = collect($res->json('data'))->where('kind', 'revision');
        $this->assertCount(1, $revisions);
        $this->assertEquals('live-project', $revisions->first()['slug']);
        $this->assertContains('title', $revisions->first()['changedFields']);
    }

    // ── The reviewer role ─────────────────────────────────────────────

    public function test_a_reviewer_may_work_the_queue_but_not_author(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::REVIEWER), ['*']);

        $this->getJson('/api/v1/review/queue')->assertOk();

        // No authoring rights at all — that independence is the role's reason
        // for existing.
        $this->postJson('/api/v1/projects', ['title' => 'Reviewer Wrote This'])
            ->assertForbidden();

        // …and no access to the analytics dashboards either.
        $this->getJson('/api/v1/analytics/overview')->assertForbidden();
    }

    // ── Organisation-scoped content ───────────────────────────────────

    public function test_colleagues_share_their_organisations_submissions(): void
    {
        $org = $this->org('Shared Org');
        $alice = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);
        $bob = $this->makeUser(Roles::PARTNER_KNOWLEDGE_MANAGER, $org->id);

        Sanctum::actingAs($alice, ['*']);
        $this->postJson('/api/v1/projects', [
            'title' => 'Alice Project',
            'summary' => 'Submitted by Alice',
        ])->assertCreated();

        // Bob sees it: the submission belongs to the organisation, not to
        // whoever happened to fill in the form.
        Sanctum::actingAs($bob, ['*']);
        $mine = $this->getJson('/api/v1/my/content')->assertOk()->json('data');
        $this->assertEquals('Alice Project', $mine[0]['title']);
        $this->assertFalse($mine[0]['isMine']);

        // And can edit it.
        $slug = Project::where('title', 'Alice Project')->first()->slug;
        $this->putJson("/api/v1/projects/{$slug}", ['summary' => 'Tidied up by Bob'])
            ->assertOk();
    }

    public function test_another_organisation_sees_nothing(): void
    {
        $orgA = $this->org('Org A');
        $orgB = $this->org('Org B');

        $alice = $this->makeUser(Roles::PARTNER_ADMIN, $orgA->id);
        $carol = $this->makeUser(Roles::PARTNER_ADMIN, $orgB->id);

        Sanctum::actingAs($alice, ['*']);
        $this->postJson('/api/v1/projects', ['title' => 'Org A Project'])->assertCreated();

        Sanctum::actingAs($carol, ['*']);
        $this->assertEmpty($this->getJson('/api/v1/my/content')->json('data'));

        $slug = Project::where('title', 'Org A Project')->first()->slug;
        $this->putJson("/api/v1/projects/{$slug}", ['title' => 'Hijacked'])->assertForbidden();
    }

    // ── Maintaining your own directory profile ────────────────────────

    public function test_a_partner_admin_can_read_and_update_their_own_profile(): void
    {
        $org = Partner::create([
            'slug' => 'my-org',
            'name' => 'My Org',
            'entity_kind' => 'organization',
            'summary' => 'Before',
            'published' => false,
            'workflow_status' => 'pending',
        ]);
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);

        Sanctum::actingAs($admin, ['*']);

        $this->getJson('/api/v1/my/partner')->assertOk()->assertJsonPath('data.name', 'My Org');

        // Not yet published, so the edit applies directly — and still cannot
        // publish itself.
        $this->putJson('/api/v1/my/partner', ['summary' => 'After'])->assertOk();

        $org->refresh();
        $this->assertEquals('After', $org->summary);
        $this->assertFalse((bool) $org->published);
    }

    public function test_editing_a_published_profile_goes_through_review(): void
    {
        $org = $this->org('Live Org');
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $org->id);

        Sanctum::actingAs($admin, ['*']);
        $this->putJson('/api/v1/my/partner', ['summary' => 'Rewritten'])->assertStatus(202);

        $this->assertNull($org->fresh()->summary);
        $this->assertEquals(1, ContentRevision::pending()->count());
    }

    public function test_a_partner_cannot_reach_another_organisations_profile(): void
    {
        $mine = $this->org('Mine');
        $theirs = $this->org('Theirs');
        $admin = $this->makeUser(Roles::PARTNER_ADMIN, $mine->id);

        Sanctum::actingAs($admin, ['*']);

        // my/partner resolves from the token, never from a supplied id, so
        // there is nothing to point at someone else's record.
        $this->getJson('/api/v1/my/partner')->assertJsonPath('data.slug', $mine->slug);
        $this->putJson("/api/v1/partners/{$theirs->slug}", ['name' => 'Taken over'])
            ->assertForbidden();
    }

    public function test_an_account_with_no_profile_is_told_so(): void
    {
        Sanctum::actingAs($this->makeUser(Roles::CONTENT_CONTRIBUTOR), ['*']);
        $this->getJson('/api/v1/my/partner')->assertNotFound();
    }

    // ── View-only files ───────────────────────────────────────────────

    public function test_a_view_only_file_is_moved_off_the_public_disk(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        Storage::disk('public')->put('uploads/documents/report.pdf', 'CONFIDENTIAL');

        $resource = Resource::create([
            'slug' => 'restricted-report',
            'title' => 'Restricted Report',
            'file_url' => Storage::disk('public')->url('uploads/documents/report.pdf'),
            'file_downloadable' => false,
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $resource->refresh();

        // The whole point: the public path no longer resolves, so "view only"
        // is not merely a hidden button.
        Storage::disk('public')->assertMissing('uploads/documents/report.pdf');
        $this->assertEquals('local', $resource->file_disk);
        Storage::disk('local')->assertExists($resource->file_path);
    }

    public function test_making_a_file_downloadable_again_returns_it_to_the_public_disk(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::disk('public')->put('uploads/documents/report.pdf', 'OPEN');

        $resource = Resource::create([
            'slug' => 'toggling-report',
            'title' => 'Toggling Report',
            'file_url' => Storage::disk('public')->url('uploads/documents/report.pdf'),
            'file_downloadable' => false,
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $resource->refresh();
        $this->assertEquals('local', $resource->file_disk);

        $resource->update(['file_downloadable' => true]);
        $resource->refresh();

        $this->assertEquals('public', $resource->file_disk);
        Storage::disk('public')->assertExists($resource->file_path);
    }

    public function test_a_restricted_file_needs_a_signed_link_and_streams_inline(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::disk('public')->put('uploads/documents/report.pdf', 'CONFIDENTIAL');

        $resource = Resource::create([
            'slug' => 'signed-report',
            'title' => 'Signed Report',
            'file_url' => Storage::disk('public')->url('uploads/documents/report.pdf'),
            'file_downloadable' => false,
            'published' => true,
            'workflow_status' => 'published',
        ]);
        $resource->refresh();

        // Unsigned: refused outright.
        $this->get('/api/v1/resources/signed-report/file')->assertForbidden();

        $link = $this->getJson('/api/v1/resources/signed-report/file-link')
            ->assertOk()
            ->assertJsonPath('data.downloadable', false)
            ->json('data.url');

        $res = $this->get($link);
        $res->assertOk();
        $this->assertStringContainsString('inline', $res->headers->get('Content-Disposition'));
        $this->assertStringContainsString('no-store', $res->headers->get('Cache-Control'));

        // Tampering with the link — to ask for an attachment, or to stretch
        // the expiry — invalidates it rather than being negotiated with.
        $this->get($link . '&download=1')->assertForbidden();
    }

    public function test_a_downloadable_file_keeps_its_ordinary_public_url(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::disk('public')->put('uploads/documents/open.pdf', 'OPEN');

        $url = Storage::disk('public')->url('uploads/documents/open.pdf');

        Resource::create([
            'slug' => 'open-link',
            'title' => 'Open Report',
            'file_url' => $url,
            'file_downloadable' => true,
            'published' => true,
            'workflow_status' => 'published',
        ]);

        // Nothing changes for open material: same URL, no expiry, still served
        // straight off disk by nginx.
        $this->getJson('/api/v1/resources/open-link/file-link')
            ->assertOk()
            ->assertJsonPath('data.downloadable', true)
            ->assertJsonPath('data.url', $url)
            ->assertJsonPath('data.expiresAt', null);
    }

    public function test_an_upload_stays_public_when_downloads_are_allowed(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Storage::disk('public')->put('uploads/documents/open.pdf', 'OPEN');

        $resource = Resource::create([
            'slug' => 'open-report',
            'title' => 'Open Report',
            'file_url' => Storage::disk('public')->url('uploads/documents/open.pdf'),
            'file_downloadable' => true,
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $resource->refresh();

        Storage::disk('public')->assertExists('uploads/documents/open.pdf');
        $this->assertNotEquals('local', $resource->file_disk);
    }
}
