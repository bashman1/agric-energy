<?php

namespace Database\Seeders;

use App\Models\Partner;
use App\Models\Project;
use App\Models\Resource;
use App\Models\SiteConfig;
use App\Models\Submission;
use App\Models\TaxonomyItem;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;

/**
 * Imports the prototype's flat-JSON content (UI/data/**) into PostgreSQL,
 * converting the string-ID relationship arrays into pivot rows. Idempotent:
 * records are matched/updated by slug so it can be re-run safely.
 */
class LegacyJsonSeeder extends Seeder
{
    private string $dataDir;

    /** slug => model id, per entity, for pivot resolution. */
    private array $ids = [
        'project' => [], 'technology' => [], 'theme' => [],
        'partner' => [], 'resource' => [],
    ];

    public function run(): void
    {
        $this->dataDir = rtrim(env('LEGACY_DATA_DIR', base_path('../UI/data')), '/');

        if (! is_dir($this->dataDir)) {
            $this->command->warn("Legacy data dir not found: {$this->dataDir} — skipping.");
            return;
        }

        // Order matters only for readability; pivots are wired after all rows exist.
        $this->seedThemes();
        $this->seedTechnologies();
        $this->seedPartners();
        $this->seedProjects();
        $this->seedResources();

        $this->wireRelationships();

        $this->seedTaxonomy();
        $this->seedSiteConfig();
        $this->seedSubmissions();

        $this->command->info('Legacy JSON import complete.');
    }

    /** Read every *.json record in a data subdirectory. */
    private function records(string $subdir): array
    {
        $dir = "{$this->dataDir}/{$subdir}";
        if (! is_dir($dir)) {
            return [];
        }
        $out = [];
        foreach (glob("{$dir}/*.json") as $file) {
            $data = json_decode(file_get_contents($file), true);
            if (is_array($data)) {
                $out[] = $data;
            }
        }
        return $out;
    }

    private function baseContent(array $r): array
    {
        return [
            'featured' => (bool) ($r['featured'] ?? false),
            'published' => (bool) ($r['published'] ?? true),
            // Existing content is live, so it is already published in the workflow.
            'workflow_status' => ($r['published'] ?? true)
                ? Theme::STATUS_PUBLISHED
                : Theme::STATUS_DRAFT,
            'updated_at' => $this->date($r['updatedAt'] ?? null),
            'created_at' => $this->date($r['updatedAt'] ?? null),
        ];
    }

    private function date(?string $v): Carbon
    {
        return $v ? Carbon::parse($v) : Carbon::now();
    }

    private function seedThemes(): void
    {
        foreach ($this->records('themes') as $r) {
            $m = Theme::updateOrCreate(['slug' => $r['slug']], array_merge([
                'name' => $r['name'] ?? '',
                'icon' => $r['icon'] ?? null,
                'summary' => $r['summary'] ?? null,
                'description' => $r['description'] ?? null,
                'why_it_matters' => $r['whyItMatters'] ?? null,
            ], $this->baseContent($r)));
            $this->ids['theme'][$r['slug']] = $m->id;
        }
    }

    private function seedTechnologies(): void
    {
        foreach ($this->records('technologies') as $r) {
            $m = Technology::updateOrCreate(['slug' => $r['slug']], array_merge([
                'name' => $r['name'] ?? '',
                'category' => $r['category'] ?? null,
                'summary' => $r['summary'] ?? null,
                'description' => $r['description'] ?? null,
                'applications' => $r['applications'] ?? [],
                'benefits' => $r['benefits'] ?? [],
                'limitations' => $r['limitations'] ?? [],
                'operational_notes' => $r['operationalNotes'] ?? [],
                'maintenance_notes' => $r['maintenanceNotes'] ?? [],
            ], $this->baseContent($r)));
            $this->ids['technology'][$r['slug']] = $m->id;
        }
    }

    private function seedPartners(): void
    {
        foreach ($this->records('partners') as $r) {
            $m = Partner::updateOrCreate(['slug' => $r['slug']], array_merge([
                'name' => $r['name'] ?? '',
                'type' => $r['type'] ?? null,
                'summary' => $r['summary'] ?? null,
                'description' => $r['description'] ?? null,
                'website' => $r['website'] ?? null,
                'email' => $r['email'] ?? null,
                'phone' => $r['phone'] ?? null,
                'logo' => $r['logo'] ?? null,
                'regions' => $r['regions'] ?? [],
                'district_coverage' => $r['districtCoverage'] ?? [],
            ], $this->baseContent($r)));
            $this->ids['partner'][$r['slug']] = $m->id;
        }
    }

    private function seedProjects(): void
    {
        foreach ($this->records('projects') as $r) {
            $m = Project::updateOrCreate(['slug' => $r['slug']], array_merge([
                'title' => $r['title'] ?? '',
                'summary' => $r['summary'] ?? null,
                'description' => $r['description'] ?? null,
                'region' => $r['region'] ?? null,
                'district' => $r['district'] ?? null,
                'regions' => $r['regions'] ?? [],
                'districts' => $r['districts'] ?? [],
                'location_note' => $r['locationNote'] ?? null,
                'lat' => Arr::get($r, 'coordinates.lat'),
                'lng' => Arr::get($r, 'coordinates.lng'),
                'funding_partner' => $r['fundingPartner'] ?? null,
                'budget' => $r['budget'] ?? null,
                'budget_currency' => $r['budgetCurrency'] ?? null,
                'beneficiary_count' => $r['beneficiaryCount'] ?? null,
                'value_chain' => $r['valueChain'] ?? null,
                'beneficiaries' => $r['beneficiaries'] ?? [],
                'status' => $r['status'] ?? null,
                'start_date' => $r['startDate'] ?? null,
                'end_date' => $r['endDate'] ?? null,
                'outcomes' => $r['outcomes'] ?? null,
                'featured_image' => $r['featuredImage'] ?? null,
                'gallery' => $r['gallery'] ?? [],
                'external_url' => $r['externalUrl'] ?? null,
            ], $this->baseContent($r)));
            $this->ids['project'][$r['slug']] = $m->id;
        }
    }

    private function seedResources(): void
    {
        foreach ($this->records('resources') as $r) {
            $m = Resource::updateOrCreate(['slug' => $r['slug']], array_merge([
                'title' => $r['title'] ?? '',
                'type' => $r['type'] ?? null,
                'summary' => $r['summary'] ?? null,
                'description' => $r['description'] ?? null,
                'file_url' => $r['fileUrl'] ?? null,
                'external_url' => $r['externalUrl'] ?? null,
                'publication_date' => $r['publicationDate'] ?? null,
            ], $this->baseContent($r)));
            $this->ids['resource'][$r['slug']] = $m->id;
        }
    }

    /** Resolve a list of slugs to internal ids for a given entity. */
    private function resolveIds(string $entity, array $slugs): array
    {
        return collect($slugs)
            ->map(fn ($slug) => $this->ids[$entity][$slug] ?? null)
            ->filter()
            ->values()
            ->all();
    }

    private function wireRelationships(): void
    {
        // Re-read source records to access their *Ids arrays.
        foreach ($this->records('projects') as $r) {
            $p = Project::find($this->ids['project'][$r['slug']] ?? null);
            if (! $p) {
                continue;
            }
            $p->technologies()->syncWithoutDetaching($this->resolveIds('technology', $r['technologyIds'] ?? []));
            $p->themes()->syncWithoutDetaching($this->resolveIds('theme', $r['themeIds'] ?? []));
            foreach ($this->resolveIds('partner', $r['implementingPartnerIds'] ?? []) as $pid) {
                $p->partners()->syncWithoutDetaching([$pid => ['role' => 'implementing']]);
            }
        }

        foreach ($this->records('themes') as $r) {
            $t = Theme::find($this->ids['theme'][$r['slug']] ?? null);
            if (! $t) {
                continue;
            }
            $t->technologies()->syncWithoutDetaching($this->resolveIds('technology', $r['relatedTechnologyIds'] ?? []));
            $t->projects()->syncWithoutDetaching($this->resolveIds('project', $r['relatedProjectIds'] ?? []));
            $t->resources()->syncWithoutDetaching($this->resolveIds('resource', $r['relatedResourceIds'] ?? []));
        }

        foreach ($this->records('technologies') as $r) {
            $t = Technology::find($this->ids['technology'][$r['slug']] ?? null);
            if (! $t) {
                continue;
            }
            $t->projects()->syncWithoutDetaching($this->resolveIds('project', $r['relatedProjectIds'] ?? []));
            $t->resources()->syncWithoutDetaching($this->resolveIds('resource', $r['relatedResourceIds'] ?? []));
        }

        foreach ($this->records('partners') as $r) {
            $p = Partner::find($this->ids['partner'][$r['slug']] ?? null);
            if (! $p) {
                continue;
            }
            $p->technologies()->syncWithoutDetaching($this->resolveIds('technology', $r['technologyIds'] ?? []));
            $p->themes()->syncWithoutDetaching($this->resolveIds('theme', $r['themeIds'] ?? []));
            foreach ($this->resolveIds('project', $r['projectIds'] ?? []) as $pid) {
                $p->projects()->syncWithoutDetaching([$pid => ['role' => 'implementing']]);
            }
        }

        foreach ($this->records('resources') as $r) {
            $res = Resource::find($this->ids['resource'][$r['slug']] ?? null);
            if (! $res) {
                continue;
            }
            $res->technologies()->syncWithoutDetaching($this->resolveIds('technology', $r['technologyIds'] ?? []));
            $res->themes()->syncWithoutDetaching($this->resolveIds('theme', $r['themeIds'] ?? []));
        }
    }

    private function seedTaxonomy(): void
    {
        $file = "{$this->dataDir}/taxonomy/taxonomy.json";
        if (! is_file($file)) {
            return;
        }
        $data = json_decode(file_get_contents($file), true) ?: [];

        // camelCase JSON keys → snake_case taxonomy groups we store.
        $groups = [
            'valueChains' => 'value_chains',
            'projectStatuses' => 'project_statuses',
            'resourceTypes' => 'resource_types',
            'partnerTypes' => 'partner_types',
            'technologyCategories' => 'technology_categories',
            'beneficiaryTags' => 'beneficiary_tags',
        ];

        foreach ($groups as $jsonKey => $group) {
            foreach ($data[$jsonKey] ?? [] as $i => $item) {
                TaxonomyItem::updateOrCreate(
                    ['group' => $group, 'slug' => $item['slug']],
                    ['name' => $item['name'], 'sort' => $i]
                );
            }
        }
    }

    private function seedSiteConfig(): void
    {
        $file = "{$this->dataDir}/site/config.json";
        if (! is_file($file)) {
            return;
        }
        $c = json_decode(file_get_contents($file), true) ?: [];

        $config = SiteConfig::current();
        $config->fill([
            'hero' => $c['hero'] ?? null,
            'stats' => $c['stats'] ?? null,
            'featured' => [
                'projects' => $c['featuredProjectIds'] ?? [],
                'technologies' => $c['featuredTechnologyIds'] ?? [],
                'themes' => $c['featuredThemeIds'] ?? [],
                'partners' => $c['featuredPartnerIds'] ?? [],
                'resources' => $c['featuredResourceIds'] ?? [],
            ],
            'contact_email' => $c['contactEmail'] ?? null,
            'contact_phone' => $c['contactPhone'] ?? null,
            'about_summary' => $c['aboutSummary'] ?? null,
        ])->save();
    }

    private function seedSubmissions(): void
    {
        foreach ($this->records('submissions') as $r) {
            Submission::updateOrCreate(['id' => $r['id']], [
                'submission_type' => $r['submissionType'] ?? 'contact',
                'name' => $r['name'] ?? '',
                'organisation' => $r['organisation'] ?? null,
                'email' => $r['email'] ?? '',
                'subject' => $r['subject'] ?? null,
                'message' => $r['message'] ?? '',
                'status' => $r['status'] ?? 'new',
                'email_status' => $r['emailStatus'] ?? 'not_sent',
                'admin_notes' => $r['adminNotes'] ?? null,
                'submitted_at' => $this->date($r['submittedAt'] ?? null),
            ]);
        }
    }
}
