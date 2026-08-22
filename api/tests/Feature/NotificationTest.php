<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        foreach (['super-admin', 'editor', 'reviewer', 'partner', 'partner-admin'] as $role) {
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

    public function test_approval_without_notify_partner_ids_skips_notifications(): void
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

        $this->assertDatabaseMissing('notifications', [
            'notifiable_type' => User::class,
        ]);
    }
}
