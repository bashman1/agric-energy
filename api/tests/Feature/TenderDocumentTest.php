<?php

namespace Tests\Feature;

use App\Models\Opportunity;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Tenders: the uploaded notice, and the issuing body.
 *
 * `organization` and `funder` answer different questions — who put the
 * notice out versus who pays — and the forms show one or the other by type.
 * These pin down that both survive the round trip, since a silent drop in
 * the controller's attribute map is invisible until someone reports a blank
 * tender page.
 */
class TenderDocumentTest extends TestCase
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

    public function test_tender_stores_organization_and_uploaded_document(): void
    {
        Sanctum::actingAs($this->editor(), ['*']);

        $res = $this->postJson('/api/v1/opportunities', [
            'title' => 'Supply of Solar Irrigation Pumps — Lira',
            'opportunityType' => 'tender',
            'organization' => 'Ministry of Agriculture, Animal Industry and Fisheries',
            'summary' => 'Supply and installation of 40 solar pump sets.',
            'documentUrl' => '/storage/media/tender-lira-pumps.pdf',
        ]);

        $res->assertCreated();
        $opp = Opportunity::where('slug', $res->json('data.slug'))->firstOrFail();

        $this->assertSame('Ministry of Agriculture, Animal Industry and Fisheries', $opp->organization);
        $this->assertSame('/storage/media/tender-lira-pumps.pdf', $opp->document_url);
    }

    public function test_published_tender_exposes_document_to_the_public_site(): void
    {
        Opportunity::create([
            'slug' => 'lira-pumps',
            'title' => 'Supply of Solar Irrigation Pumps — Lira',
            'opportunity_type' => 'tender',
            'organization' => 'Ministry of Agriculture',
            'document_url' => '/storage/media/tender-lira-pumps.pdf',
            'published' => true,
            'workflow_status' => 'published',
        ]);

        $this->getJson('/api/v1/opportunities/lira-pumps')
            ->assertOk()
            ->assertJsonPath('data.organization', 'Ministry of Agriculture')
            ->assertJsonPath('data.documentUrl', '/storage/media/tender-lira-pumps.pdf');
    }

    public function test_opportunity_without_a_document_returns_empty_string(): void
    {
        Opportunity::create([
            'slug' => 'solar-grant',
            'title' => 'Solar Grant',
            'opportunity_type' => 'funding',
            'funder' => 'GIZ',
            'published' => true,
            'workflow_status' => 'published',
        ]);

        // "" rather than null keeps the public page's `o.documentUrl &&`
        // checks honest across every type.
        $this->getJson('/api/v1/opportunities/solar-grant')
            ->assertOk()
            ->assertJsonPath('data.documentUrl', '')
            ->assertJsonPath('data.organization', '')
            ->assertJsonPath('data.funder', 'GIZ');
    }

    public function test_document_is_available_on_every_opportunity_type(): void
    {
        Sanctum::actingAs($this->editor(), ['*']);

        foreach (['funding', 'investment', 'tender', 'procurement', 'job'] as $type) {
            $res = $this->postJson('/api/v1/opportunities', [
                'title' => "A {$type} posting",
                'opportunityType' => $type,
                'summary' => 'Summary.',
                'documentUrl' => "/storage/media/{$type}.pdf",
            ]);

            $res->assertCreated();
            $opp = Opportunity::where('slug', $res->json('data.slug'))->firstOrFail();

            $this->assertSame("/storage/media/{$type}.pdf", $opp->document_url, "document dropped for {$type}");
        }
    }
}
