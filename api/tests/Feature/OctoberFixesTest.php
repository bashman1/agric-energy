<?php

namespace Tests\Feature;

use App\Models\Partner;
use App\Models\Technology;
use App\Models\User;
use App\Notifications\AccountApprovedNotification;
use App\Notifications\AccountRejectedNotification;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Registration review (reject with comments + email), technology list
 * normalisation and sub-category, gallery cap, and the creator name on
 * staff reads.
 */
class OctoberFixesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    private function makeUser(string $role, string $status = User::STATUS_APPROVED, array $attrs = []): User
    {
        $user = User::create(array_merge([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => $status,
        ], $attrs));
        $user->assignRole($role);
        return $user;
    }

    // ── Registration review ─────────────────────────────────────────

    public function test_rejecting_a_registration_requires_comments(): void
    {
        $applicant = $this->makeUser('partner', User::STATUS_PENDING);
        Sanctum::actingAs($this->makeUser('platform-admin'), ['*']);

        $this->postJson("/api/v1/users/{$applicant->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors(['notes']);

        $this->assertSame(User::STATUS_PENDING, $applicant->fresh()->status);
    }

    public function test_rejected_applicant_is_emailed_and_cannot_log_in(): void
    {
        Notification::fake();

        $partner = Partner::create([
            'slug' => 'applicant-org',
            'name' => 'Applicant Org',
            'published' => false,
            'workflow_status' => Partner::STATUS_PENDING,
        ]);
        $applicant = $this->makeUser('partner', User::STATUS_PENDING, ['partner_id' => $partner->id]);
        Sanctum::actingAs($this->makeUser('platform-admin'), ['*']);

        $this->postJson("/api/v1/users/{$applicant->id}/reject", ['notes' => 'Registration certificate missing.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.reviewNotes', 'Registration certificate missing.');

        Notification::assertSentTo($applicant, AccountRejectedNotification::class);

        // The directory profile filed with the registration is returned too.
        $this->assertSame(Partner::STATUS_REJECTED, $partner->fresh()->workflow_status);

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => $applicant->email, 'password' => 'secret123'])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_only_pending_registrations_can_be_rejected(): void
    {
        $active = $this->makeUser('partner');
        Sanctum::actingAs($this->makeUser('platform-admin'), ['*']);

        $this->postJson("/api/v1/users/{$active->id}/reject", ['notes' => 'No.'])
            ->assertStatus(422);
    }

    public function test_approving_an_application_emails_the_applicant(): void
    {
        Notification::fake();

        $applicant = $this->makeUser('partner', User::STATUS_PENDING);
        $suspended = $this->makeUser('partner', User::STATUS_SUSPENDED);
        Sanctum::actingAs($this->makeUser('platform-admin'), ['*']);

        $this->postJson("/api/v1/users/{$applicant->id}/approve")->assertOk();
        $this->postJson("/api/v1/users/{$suspended->id}/approve")->assertOk();

        Notification::assertSentTo($applicant, AccountApprovedNotification::class);
        // Lifting a suspension is not an application decision.
        Notification::assertNotSentTo($suspended, AccountApprovedNotification::class);
    }

    // ── Technologies ────────────────────────────────────────────────

    public function test_partner_style_technology_lists_are_stored_as_arrays(): void
    {
        Sanctum::actingAs($this->makeUser('knowledge-manager'), ['*']);

        $res = $this->postJson('/api/v1/technologies', [
            'name' => 'Solar Dryer',
            'category' => 'Solar Energy',
            'subcategory' => 'Solar drying',
            'published' => true,
            'applications' => "Drying maize\n\nDrying fish ",
            'operationalNotes' => [
                'amountUsed' => '3 units',
                'technologyStatus' => 'new',
                'notes' => "Clean weekly\nShade when idle",
            ],
        ])->assertCreated();

        $res->assertJsonPath('data.subcategory', 'Solar drying')
            ->assertJsonPath('data.applications', ['Drying maize', 'Drying fish'])
            ->assertJsonPath('data.operationalNotes', [
                'Amount used: 3 units',
                'Technology status: New',
                'Clean weekly',
                'Shade when idle',
            ]);

        $this->getJson('/api/v1/technologies?subcategory=Solar%20drying')
            ->assertJsonPath('total', 1);
    }

    public function test_creator_name_is_shown_to_staff_only(): void
    {
        $author = $this->makeUser('knowledge-manager', User::STATUS_APPROVED, ['name' => 'Grace Officer']);
        Technology::create([
            'slug' => 'biogas', 'name' => 'Biogas', 'published' => true,
            'workflow_status' => 'published', 'created_by' => $author->id,
        ]);

        $this->getJson('/api/v1/technologies/biogas')
            ->assertOk()->assertJsonMissingPath('data.createdBy');

        Sanctum::actingAs($this->makeUser('reviewer'), ['*']);
        $this->getJson('/api/v1/technologies/biogas?admin=true')
            ->assertJsonPath('data.createdBy', 'Grace Officer');
        $this->getJson('/api/v1/technologies?admin=true')
            ->assertJsonPath('data.0.createdBy', 'Grace Officer');
    }

    // ── Galleries ───────────────────────────────────────────────────

    public function test_gallery_is_capped_at_ten_images(): void
    {
        Sanctum::actingAs($this->makeUser('knowledge-manager'), ['*']);
        $images = array_map(fn ($i) => "/storage/uploads/images/{$i}.jpg", range(1, 11));

        $this->postJson('/api/v1/projects', ['title' => 'Too many photos', 'gallery' => $images])
            ->assertStatus(422)->assertJsonValidationErrors(['gallery']);

        $this->postJson('/api/v1/projects', ['title' => 'Enough photos', 'gallery' => array_slice($images, 0, 10)])
            ->assertCreated();
    }
}
