<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\Project;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
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

    public function test_approval_dispatches_notification_to_notify_partner_ids(): void
    {
        $partnerOrg = Partner::create([
            'slug' => 'notify-org-' . uniqid(),
            'name' => 'Notify Partner Org',
            'type' => 'Implementing Partner',
        ]);

        $targetUser = User::create([
            'name' => 'Target Partner',
            'email' => 'target-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
            'partner_id' => $partnerOrg->id,
        ]);
        $targetUser->assignRole('partner');

        $submitter = $this->makeUser('partner');
        Sanctum::actingAs($submitter, ['*']);

        $res = $this->postJson('/api/v1/projects', [
            'title' => 'Notify Me Project',
            'summary' => 'A project that notifies a partner',
            'notifyPartnerIds' => [$partnerOrg->slug],
        ]);
        $res->assertCreated();

        $project = Project::where('title', 'Notify Me Project')->first();
        $this->assertNotNull($project);
        $this->assertEquals([$partnerOrg->slug], $project->notify_partner_ids);

        $reviewer = $this->makeUser('knowledge-manager');
        Sanctum::actingAs($reviewer, ['*']);

        $this->postJson("/api/v1/projects/{$project->slug}/approve")->assertOk();

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $targetUser->id,
            'notifiable_type' => User::class,
            'type' => \App\Notifications\ContentPublishedNotification::class,
        ]);

        $notification = $targetUser->notifications()->first();
        $this->assertNotNull($notification);
        $this->assertEquals('content_published', $notification->data['type']);
        $this->assertEquals('projects', $notification->data['contentType']);
        $this->assertEquals($project->slug, $notification->data['slug']);
    }

    public function test_approval_without_notify_partner_ids_notifies_only_the_author(): void
    {
        $submitter = $this->makeUser('partner');
        Sanctum::actingAs($submitter, ['*']);

        $res = $this->postJson('/api/v1/projects', [
            'title' => 'No Notify Project',
            'summary' => 'A project with no notification targets',
        ]);
        $res->assertCreated();

        $project = Project::where('title', 'No Notify Project')->first();
        $this->assertNotNull($project);

        $reviewer = $this->makeUser('knowledge-manager');
        Sanctum::actingAs($reviewer, ['*']);

        $this->postJson("/api/v1/projects/{$project->slug}/approve")->assertOk();

        // Nobody was nominated, so no third party hears about it — but the
        // author does. They are the one waiting to know.
        $this->assertEquals(1, DB::table('notifications')->count());
        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => User::class,
            'notifiable_id' => $submitter->id,
        ]);
    }

    public function test_rejection_notifies_the_author_with_the_reviewer_notes(): void
    {
        $submitter = $this->makeUser('partner');
        Sanctum::actingAs($submitter, ['*']);

        $this->postJson('/api/v1/projects', [
            'title' => 'Needs Work',
            'summary' => 'A project that will be returned',
        ])->assertCreated();

        $project = Project::where('title', 'Needs Work')->first();

        $reviewer = $this->makeUser('knowledge-manager');
        Sanctum::actingAs($reviewer, ['*']);

        $this->postJson("/api/v1/projects/{$project->slug}/reject", [
            'notes' => 'Please add the district and the funding partner.',
        ])->assertOk();

        // A returned submission used to reach nobody: the status changed and
        // the notes were saved where only a return visit would find them.
        $notification = DB::table('notifications')
            ->where('notifiable_id', $submitter->id)
            ->first();

        $this->assertNotNull($notification);
        $data = json_decode($notification->data, true);
        $this->assertEquals('content_rejected', $data['type']);
        $this->assertStringContainsString('district', $data['notes']);
    }

    public function test_a_reviewer_may_not_approve_their_own_submission(): void
    {
        // The separation of duties the platform claims: whoever wrote it is
        // not the person who signs it off, whatever roles they hold.
        $author = $this->makeUser('knowledge-manager');
        Sanctum::actingAs($author, ['*']);

        $this->postJson('/api/v1/projects', [
            'title' => 'Self Approved',
            'summary' => 'Written and reviewed by the same person',
            'published' => false,
        ])->assertCreated();

        $project = Project::where('title', 'Self Approved')->first();

        $this->postJson("/api/v1/projects/{$project->slug}/approve")->assertForbidden();

        // A different reviewer can.
        $other = $this->makeUser('reviewer');
        Sanctum::actingAs($other, ['*']);
        $this->postJson("/api/v1/projects/{$project->slug}/approve")->assertOk();

        $this->assertTrue((bool) $project->fresh()->published);
    }
}
