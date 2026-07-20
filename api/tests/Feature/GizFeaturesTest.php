<?php

namespace Tests\Feature;

use App\Models\Opportunity;
use App\Models\Post;
use App\Models\Project;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Coverage of the GIZ-inspired feature additions: newsletter double opt-in,
 * search autocomplete, open-data exports/aggregates, and the new content
 * discriminators (post category, opportunity type).
 */
class GizFeaturesTest extends TestCase
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

    // ── Newsletter ───────────────────────────────────────────────────────────

    /**
     * Messages captured by the `array` mail transport (phpunit.xml). The
     * controller sends via `Mail::raw()`, which `Mail::fake()` silently
     * discards without recording, so the transport is the reliable spy.
     *
     * @return Collection<int, \Symfony\Component\Mime\Email>
     */
    private function sentMail(): Collection
    {
        /** @var \Illuminate\Mail\Mailer $mailer */
        $mailer = Mail::mailer();

        return $mailer->getSymfonyTransport()->messages()->map->getOriginalMessage();
    }

    public function test_newsletter_subscribe_then_confirm_activates_the_subscriber(): void
    {
        $this->postJson('/api/v1/newsletter/subscribe', [
            'email' => 'Reader@Example.Test',
            'name' => 'Curious Reader',
        ])->assertStatus(202);

        // Stored lower-cased, unconfirmed, with an unguessable token.
        $subscriber = Subscriber::where('email', 'reader@example.test')->first();
        $this->assertNotNull($subscriber);
        $this->assertNull($subscriber->confirmed_at);
        $this->assertNotEmpty($subscriber->token);

        // A double opt-in mail carrying the confirmation link went out.
        $this->assertCount(1, $this->sentMail());
        $mail = $this->sentMail()->first();
        $this->assertEquals('reader@example.test', $mail->getTo()[0]->getAddress());
        $this->assertStringContainsString(
            "/api/v1/newsletter/confirm/{$subscriber->token}",
            $mail->getTextBody()
        );

        $this->get("/api/v1/newsletter/confirm/{$subscriber->token}")
            ->assertRedirectContains('status=confirmed');

        $this->assertTrue($subscriber->fresh()->isActive());
    }

    public function test_newsletter_confirm_with_an_unknown_token_is_rejected(): void
    {
        $this->get('/api/v1/newsletter/confirm/not-a-real-token')
            ->assertRedirectContains('status=invalid');
    }

    public function test_newsletter_unsubscribe_deactivates_the_subscriber(): void
    {
        $subscriber = Subscriber::create([
            'email' => 'leaving@example.test',
            'token' => 'unsub-token',
            'confirmed_at' => now(),
        ]);

        $this->get("/api/v1/newsletter/unsubscribe/{$subscriber->token}")
            ->assertRedirectContains('status=unsubscribed');

        $this->assertFalse($subscriber->fresh()->isActive());
    }

    public function test_duplicate_subscribe_is_idempotent_and_clears_a_previous_unsubscribe(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'dupe@example.test'])
            ->assertStatus(202);

        $subscriber = Subscriber::where('email', 'dupe@example.test')->first();
        $subscriber->update(['confirmed_at' => now(), 'unsubscribed_at' => now()]);

        // Re-subscribing must not blow up on the unique email index.
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'dupe@example.test'])
            ->assertStatus(202);

        $this->assertEquals(1, Subscriber::where('email', 'dupe@example.test')->count());
        $this->assertNull($subscriber->fresh()->unsubscribed_at);
    }

    public function test_newsletter_subscribe_validates_the_email(): void
    {
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'not-an-email'])
            ->assertStatus(422);
    }

    public function test_newsletter_subscribers_requires_staff(): void
    {
        Subscriber::create(['email' => 'a@example.test', 'token' => 't1', 'confirmed_at' => now()]);
        Subscriber::create(['email' => 'b@example.test', 'token' => 't2']);

        $this->getJson('/api/v1/newsletter/subscribers')->assertUnauthorized();

        $partner = $this->makeUser('partner');
        Sanctum::actingAs($partner, ['*']);
        $this->getJson('/api/v1/newsletter/subscribers')->assertForbidden();

        $editor = $this->makeUser('editor');
        Sanctum::actingAs($editor, ['*']);
        $res = $this->getJson('/api/v1/newsletter/subscribers');
        $res->assertOk();
        $this->assertEquals(2, $res->json('total'));
        $this->assertEquals(1, $res->json('active'));
    }

    // ── Search autocomplete ──────────────────────────────────────────────────

    public function test_suggest_ranks_prefix_matches_and_hides_drafts(): void
    {
        $this->publishedProject(['title' => 'Rooftop Solar Dryers']);   // substring match
        $this->publishedProject(['title' => 'Solar Water Pumping']);    // prefix match
        Project::create([
            'slug' => 'draft-solar',
            'title' => 'Solar Draft Scheme',
            'published' => false,
            'workflow_status' => 'draft',
        ]);

        $res = $this->getJson('/api/v1/search/suggest?q=solar');
        $res->assertOk();

        $titles = array_column($res->json('data'), 'title');
        $this->assertEquals('Solar Water Pumping', $titles[0]); // prefix first
        $this->assertContains('Rooftop Solar Dryers', $titles);
        $this->assertNotContains('Solar Draft Scheme', $titles);

        $this->assertEquals('projects', $res->json('data.0.type'));
        $this->assertStringStartsWith('/projects/', $res->json('data.0.href'));
    }

    public function test_suggest_returns_nothing_below_two_characters(): void
    {
        $this->publishedProject(['title' => 'Solar Water Pumping']);

        $this->getJson('/api/v1/search/suggest?q=s')->assertOk()->assertJson(['data' => []]);
        $this->getJson('/api/v1/search/suggest')->assertOk()->assertJson(['data' => []]);
    }

    public function test_suggest_caps_the_result_list(): void
    {
        foreach (range(1, 12) as $i) {
            $this->publishedProject(['title' => "Solar Scheme {$i}"]);
        }

        $this->assertLessThanOrEqual(8, count($this->getJson('/api/v1/search/suggest?q=solar')->json('data')));
    }

    // ── Open data ────────────────────────────────────────────────────────────

    public function test_open_data_csv_contains_published_projects_only(): void
    {
        $this->publishedProject([
            'title' => 'Public CSV Project',
            'region' => 'Northern Uganda',
            'budget' => 250000,
            'budget_currency' => 'USD',
            'beneficiary_count' => 340,
        ]);
        Project::create([
            'slug' => 'hidden-csv',
            'title' => 'Hidden CSV Project',
            'published' => false,
            'workflow_status' => 'draft',
        ]);

        $res = $this->get('/api/v1/open-data/projects.csv');
        $res->assertOk();

        $csv = $res->streamedContent();
        $this->assertStringContainsString('Slug,Title,Region', $csv);
        $this->assertStringContainsString('Public CSV Project', $csv);
        $this->assertStringContainsString('340', $csv);
        $this->assertStringNotContainsString('Hidden CSV Project', $csv);
    }

    public function test_open_data_geojson_only_exposes_published_geolocated_projects(): void
    {
        $this->publishedProject([
            'title' => 'Mapped Project',
            'lat' => 1.92,
            'lng' => 33.6,
            'budget' => 120000,
            'beneficiary_count' => 80,
        ]);
        $this->publishedProject(['title' => 'Unmapped Project']); // no coordinates
        Project::create([
            'slug' => 'hidden-geo',
            'title' => 'Hidden Geo Project',
            'published' => false,
            'workflow_status' => 'draft',
            'lat' => 0.5,
            'lng' => 32.5,
        ]);

        $res = $this->getJson('/api/v1/open-data/projects.geojson');
        $res->assertOk()->assertJsonPath('type', 'FeatureCollection');

        $features = $res->json('features');
        $this->assertCount(1, $features);
        $this->assertEquals('Mapped Project', $features[0]['properties']['title']);
        $this->assertEquals([33.6, 1.92], $features[0]['geometry']['coordinates']);
        $this->assertEquals(80, $features[0]['properties']['beneficiaries']);
    }

    public function test_open_data_regions_aggregates_count_budget_and_beneficiaries(): void
    {
        $this->publishedProject(['region' => 'Northern Uganda', 'budget' => 100000, 'beneficiary_count' => 300]);
        $this->publishedProject(['region' => 'Northern Uganda', 'budget' => 50000, 'beneficiary_count' => 120]);
        $this->publishedProject(['region' => 'Western Uganda', 'budget' => null, 'beneficiary_count' => null]);
        Project::create([
            'slug' => 'hidden-region',
            'title' => 'Hidden Region Project',
            'published' => false,
            'workflow_status' => 'draft',
            'region' => 'Northern Uganda',
            'budget' => 999999,
        ]);

        $res = $this->getJson('/api/v1/open-data/regions');
        $res->assertOk();

        $byRegion = collect($res->json('data'))->keyBy('region');
        $this->assertCount(2, $byRegion);

        $this->assertEquals(2, $byRegion['Northern Uganda']['count']);
        $this->assertEquals(150000.0, $byRegion['Northern Uganda']['totalBudget']);
        $this->assertEquals(420, $byRegion['Northern Uganda']['beneficiaries']);

        // Null budgets/beneficiaries coalesce to zero rather than null.
        $this->assertEquals(1, $byRegion['Western Uganda']['count']);
        $this->assertEquals(0.0, $byRegion['Western Uganda']['totalBudget']);
        $this->assertEquals(0, $byRegion['Western Uganda']['beneficiaries']);
    }

    // ── New content discriminators ───────────────────────────────────────────

    public function test_opportunities_can_be_filtered_by_type(): void
    {
        Opportunity::create([
            'slug' => 'tender-1',
            'title' => 'Supply of Solar Pumps',
            'opportunity_type' => 'tender',
            'published' => true,
            'workflow_status' => 'published',
        ]);
        Opportunity::create([
            'slug' => 'grant-1',
            'title' => 'Agri-Energy Innovation Grant',
            'opportunity_type' => 'funding',
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $this->assertEquals(2, $this->getJson('/api/v1/opportunities')->json('total'));

        $res = $this->getJson('/api/v1/opportunities?type=tender');
        $res->assertOk();
        $this->assertEquals(1, $res->json('total'));
        $this->assertEquals('Supply of Solar Pumps', $res->json('data.0.title'));
        $this->assertEquals('tender', $res->json('data.0.opportunityType'));
    }

    public function test_posts_can_be_filtered_by_category(): void
    {
        Post::create([
            'slug' => 'story-1',
            'title' => 'A Farmer’s Solar Story',
            'category' => 'story',
            'gallery' => ['/media/one.jpg', '/media/two.jpg'],
            'published' => true,
            'workflow_status' => 'published',
        ]);
        Post::create([
            'slug' => 'news-1',
            'title' => 'Desk Launches New Portal',
            'category' => 'news',
            'published' => true,
            'workflow_status' => 'published',
        ]);
        Post::create([
            'slug' => 'story-draft',
            'title' => 'Unpublished Story',
            'category' => 'story',
            'published' => false,
            'workflow_status' => 'draft',
        ]);

        $this->assertEquals(2, $this->getJson('/api/v1/posts')->json('total'));

        $res = $this->getJson('/api/v1/posts?category=story');
        $res->assertOk();
        $this->assertEquals(1, $res->json('total'));
        $this->assertEquals('story', $res->json('data.0.category'));
        $this->assertCount(2, $res->json('data.0.gallery'));
    }
}
