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
 * Coverage of the administrative reporting module: access control, the report
 * catalogue, period scoping and the structure every report must satisfy for
 * the PDF/Excel renderers to consume it.
 */
class ReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (Roles::ALL as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    private function makeUser(string $role): User
    {
        $user = User::create([
            'name' => ucfirst($role) . ' User',
            'email' => $role . '-' . uniqid() . '@example.test',
            'password' => Hash::make('secret123'),
            'status' => User::STATUS_APPROVED,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function actAsStaff(): User
    {
        $admin = $this->makeUser('super-admin');
        Sanctum::actingAs($admin, ['*']);

        return $admin;
    }

    public function test_reports_require_staff(): void
    {
        $this->getJson('/api/v1/reports')->assertUnauthorized();

        Sanctum::actingAs($this->makeUser('partner'), ['*']);
        $this->getJson('/api/v1/reports')->assertForbidden();
        $this->getJson('/api/v1/reports/platform-overview')->assertForbidden();

        $this->actAsStaff();
        $this->getJson('/api/v1/reports')->assertOk();
    }

    public function test_catalogue_lists_available_reports(): void
    {
        $this->actAsStaff();

        $response = $this->getJson('/api/v1/reports')->assertOk();
        $keys = collect($response->json('data'))->pluck('key');

        $this->assertContains('platform-overview', $keys);
        $this->assertContains('project-portfolio', $keys);
        $response->assertJsonStructure([
            'data' => [['key', 'title', 'description']],
        ]);
    }

    public function test_unknown_report_is_not_found(): void
    {
        $this->actAsStaff();

        $this->getJson('/api/v1/reports/does-not-exist')->assertNotFound();
    }

    public function test_invalid_period_is_rejected(): void
    {
        $this->actAsStaff();

        $this->getJson('/api/v1/reports/content-growth?from=not-a-date')
            ->assertStatus(422);
    }

    /** Every report must carry the shape the export renderers expect. */
    public function test_every_report_returns_a_renderable_document(): void
    {
        $this->actAsStaff();

        foreach (collect($this->getJson('/api/v1/reports')->json('data'))->pluck('key') as $key) {
            $response = $this->getJson("/api/v1/reports/{$key}")->assertOk();

            $response->assertJsonStructure([
                'data' => [
                    'key', 'title', 'description', 'generatedAt',
                    'period' => ['from', 'to', 'label'],
                    'summary' => [['label', 'value']],
                    'sections' => [['heading', 'kind', 'columns', 'rows']],
                ],
            ]);

            foreach ($response->json('data.sections') as $section) {
                foreach ($section['rows'] as $row) {
                    $this->assertCount(
                        count($section['columns']),
                        $row,
                        "Row width mismatch in {$key} → {$section['heading']}"
                    );
                }
            }
        }
    }

    public function test_period_scopes_counts_and_month_buckets(): void
    {
        $this->actAsStaff();

        Project::create([
            'slug' => 'in-window', 'title' => 'In Window', 'published' => true,
            'workflow_status' => 'published', 'created_at' => '2026-03-15',
            'updated_at' => '2026-03-15',
        ]);
        Project::create([
            'slug' => 'out-of-window', 'title' => 'Out Of Window', 'published' => true,
            'workflow_status' => 'published', 'created_at' => '2025-01-10',
            'updated_at' => '2025-01-10',
        ]);

        $data = $this->getJson('/api/v1/reports/content-growth?from=2026-03-01&to=2026-05-31')
            ->assertOk()
            ->json('data');

        $this->assertSame('1 Mar 2026 – 31 May 2026', $data['period']['label']);

        $months = collect($data['sections'][0]['rows'])->pluck(0);
        $this->assertSame(['Mar 2026', 'Apr 2026', 'May 2026'], $months->all());

        // Only the in-window project counts towards the period total.
        $added = collect($data['summary'])->firstWhere('label', 'Records added in period');
        $this->assertSame(1, $added['value']);
    }

    public function test_project_portfolio_reflects_published_projects(): void
    {
        $this->actAsStaff();

        Project::create([
            'slug' => 'pub-1', 'title' => 'Published One', 'published' => true,
            'workflow_status' => 'published', 'region' => 'Northern Uganda',
            'district' => 'Gulu', 'status' => 'Active', 'beneficiary_count' => 500,
        ]);
        Project::create([
            'slug' => 'draft-1', 'title' => 'Hidden Draft', 'published' => false,
            'workflow_status' => 'draft', 'region' => 'Central Uganda',
            'beneficiary_count' => 9999,
        ]);

        $data = $this->getJson('/api/v1/reports/project-portfolio')->assertOk()->json('data');
        $summary = collect($data['summary']);

        $this->assertSame(1, $summary->firstWhere('label', 'Published projects')['value']);
        $this->assertSame(500, $summary->firstWhere('label', 'Beneficiaries reached')['value']);

        $regions = collect($data['sections'])->firstWhere('heading', 'Projects by region');
        $this->assertSame([['Northern Uganda', 1]], $regions['rows']);
    }

    public function test_stakeholder_directory_excludes_unpublished_partners(): void
    {
        $this->actAsStaff();

        Partner::create([
            'slug' => 'era', 'name' => 'ERA Uganda', 'type' => 'Government',
            'published' => true, 'workflow_status' => 'published',
        ]);
        Partner::create([
            'slug' => 'hidden', 'name' => 'Hidden Org', 'type' => 'NGO',
            'published' => false, 'workflow_status' => 'draft',
        ]);

        $data = $this->getJson('/api/v1/reports/stakeholder-directory')->assertOk()->json('data');

        $directory = collect($data['sections'])->firstWhere('heading', 'Directory');
        $this->assertCount(1, $directory['rows']);
        $this->assertSame('ERA Uganda', $directory['rows'][0][0]);
    }
}
