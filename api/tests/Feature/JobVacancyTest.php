<?php

namespace Tests\Feature;

use App\Models\Opportunity;
use App\Models\User;
use App\Support\HtmlSanitizer;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Job/vacancy postings.
 *
 * A vacancy is the "job" opportunity type rather than a record of its own,
 * so the coverage here is about the fields that only it uses, and about the
 * HTML the CKEditor fields now carry.
 */
class JobVacancyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    private function editor(): User
    {
        $user = User::create([
            'name' => 'Editor User',
            'email' => 'editor-'.uniqid().'@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);
        $user->assignRole(Roles::KNOWLEDGE_MANAGER);

        return $user;
    }

    // ── Round trip ───────────────────────────────────────────────────────────

    public function test_job_fields_persist_and_are_returned(): void
    {
        Sanctum::actingAs($this->editor(), ['*']);

        $res = $this->postJson('/api/v1/opportunities', [
            'title' => 'Solar Irrigation Field Officer',
            'opportunityType' => 'job',
            'organization' => 'Ministry of Energy and Mineral Development',
            'summary' => 'Field officer for the Lira solar irrigation rollout.',
            'description' => '<p>Lead the <strong>district rollout</strong>.</p>',
            'dutiesResponsibilities' => '<ul><li>Site surveys</li><li>Farmer training</li></ul>',
            'minimumEducation' => "Bachelor's degree in Agricultural Engineering",
            'experience' => '5 years in renewable energy projects',
            'competences' => '<p>Fluent in Luo and English.</p>',
        ]);

        $res->assertCreated();

        // The camelCase payload has to land on the snake_case columns —
        // a field missing from the controller's map would be dropped in
        // silence, which is exactly the failure this pins down.
        $opp = Opportunity::where('slug', $res->json('data.slug'))->firstOrFail();

        $this->assertSame('job', $opp->opportunity_type);
        $this->assertSame('Ministry of Energy and Mineral Development', $opp->organization);
        $this->assertSame("Bachelor's degree in Agricultural Engineering", $opp->minimum_education);
        $this->assertSame('5 years in renewable energy projects', $opp->experience);
        $this->assertSame('<ul><li>Site surveys</li><li>Farmer training</li></ul>', $opp->duties_responsibilities);
        $this->assertSame('<p>Fluent in Luo and English.</p>', $opp->competences);
    }

    public function test_published_vacancy_exposes_job_fields_to_the_public_site(): void
    {
        Opportunity::create([
            'slug' => 'field-officer',
            'title' => 'Solar Irrigation Field Officer',
            'opportunity_type' => 'job',
            'organization' => 'Ministry of Energy and Mineral Development',
            'duties_responsibilities' => '<ul><li>Site surveys</li></ul>',
            'minimum_education' => "Bachelor's degree",
            'experience' => '5 years',
            'competences' => '<p>Fluent in Luo.</p>',
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $this->getJson('/api/v1/opportunities/field-officer')
            ->assertOk()
            ->assertJsonPath('data.opportunityType', 'job')
            ->assertJsonPath('data.organization', 'Ministry of Energy and Mineral Development')
            ->assertJsonPath('data.minimumEducation', "Bachelor's degree")
            ->assertJsonPath('data.experience', '5 years')
            ->assertJsonPath('data.dutiesResponsibilities', '<ul><li>Site surveys</li></ul>')
            ->assertJsonPath('data.competences', '<p>Fluent in Luo.</p>');
    }

    public function test_non_job_opportunity_returns_empty_job_fields(): void
    {
        Opportunity::create([
            'slug' => 'solar-grant',
            'title' => 'Solar Grant',
            'opportunity_type' => 'funding',
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $this->getJson('/api/v1/opportunities/solar-grant')
            ->assertOk()
            ->assertJsonPath('data.organization', '')
            ->assertJsonPath('data.dutiesResponsibilities', '')
            ->assertJsonPath('data.competences', '');
    }

    // ── Sanitising ───────────────────────────────────────────────────────────

    public function test_script_tags_are_stripped_from_rich_text_on_write(): void
    {
        Sanctum::actingAs($this->editor(), ['*']);

        $res = $this->postJson('/api/v1/opportunities', [
            'title' => 'Hostile Vacancy',
            'opportunityType' => 'job',
            'summary' => 'Plain enough.',
            'competences' => '<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(1)>',
            'dutiesResponsibilities' => '<p onclick="steal()">Click me</p>',
        ]);

        $res->assertCreated();
        $opp = Opportunity::where('slug', $res->json('data.slug'))->firstOrFail();

        $this->assertStringNotContainsString('script', $opp->competences);
        $this->assertStringNotContainsString('onerror', $opp->competences);
        $this->assertStringContainsString('<p>Safe</p>', $opp->competences);

        $this->assertStringNotContainsString('onclick', $opp->duties_responsibilities);
        $this->assertStringContainsString('Click me', $opp->duties_responsibilities);
    }

    public function test_javascript_links_lose_their_href_but_keep_their_text(): void
    {
        $clean = HtmlSanitizer::clean('<a href="javascript:alert(1)">Apply here</a>');

        $this->assertStringNotContainsString('javascript', $clean);
        $this->assertStringContainsString('Apply here', $clean);
    }

    public function test_external_links_survive_with_noopener(): void
    {
        $clean = HtmlSanitizer::clean('<a href="https://jobs.example.test" target="_blank">Apply</a>');

        $this->assertStringContainsString('href="https://jobs.example.test"', $clean);
        $this->assertStringContainsString('noopener', $clean);
    }

    public function test_cleared_editor_field_is_stored_as_empty(): void
    {
        Sanctum::actingAs($this->editor(), ['*']);

        // What CKEditor actually sends for a field the user emptied.
        $res = $this->postJson('/api/v1/opportunities', [
            'title' => 'Emptied Vacancy',
            'opportunityType' => 'job',
            'summary' => 'Teaser.',
            'competences' => '<p>&nbsp;</p>',
        ]);

        $res->assertCreated();
        $opp = Opportunity::where('slug', $res->json('data.slug'))->firstOrFail();

        $this->assertSame('', $opp->competences);
    }

    public function test_formatting_the_editor_can_produce_is_preserved(): void
    {
        $clean = HtmlSanitizer::clean(
            '<h3>Role</h3><p><strong>Bold</strong> and <em>italic</em> and <u>underlined</u>.</p>'
            .'<ol><li>First</li></ol><blockquote>Quoted</blockquote>'
        );

        foreach (['<h3>', '<strong>', '<em>', '<u>', '<ol>', '<li>', '<blockquote>'] as $tag) {
            $this->assertStringContainsString($tag, $clean);
        }
    }

    public function test_unicode_survives_sanitising(): void
    {
        // Sanitising runs through DOMDocument, which mangles UTF-8 unless the
        // encoding is declared — a silent corruption worth pinning down.
        $this->assertStringContainsString('Karamoja — café', HtmlSanitizer::clean('<p>Karamoja — café</p>'));
    }
}
