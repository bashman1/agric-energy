<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\PartnerResource;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PartnerController extends ContentController
{
    protected string $modelClass = Partner::class;
    protected string $resourceClass = PartnerResource::class;
    protected array $with = ['technologies', 'themes', 'projects'];
    protected array $searchable = ['name', 'summary', 'type', 'description'];
    protected array $filters = [
        'type' => 'type',
        'entityKind' => 'entity_kind',
        'featured' => 'featured',
    ];
    protected string $orderBy = 'name';
    protected string $orderDir = 'asc';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'name' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'email' => 'nullable|email',
            'website' => 'nullable|string|max:255',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'name' => 'name',
            'entityKind' => 'entity_kind',
            'type' => 'type',
            'position' => 'position',
            'affiliation' => 'affiliation',
            'yearsExperience' => 'years_experience',
            'category' => 'category',
            'summary' => 'summary',
            'description' => 'description',
            'website' => 'website',
            'email' => 'email',
            'phone' => 'phone',
            'logo' => 'logo',
            'acronym' => 'acronym',
            'registrationNumber' => 'registration_number',
            'taxId' => 'tax_id',
            'yearEstablished' => 'year_established',
            'physicalAddress' => 'physical_address',
            'postalAddress' => 'postal_address',
            'mission' => 'mission',
            'employeesBand' => 'employees_band',
            'branchesBand' => 'branches_band',
            'beneficiariesBand' => 'beneficiaries_band',
            'annualBudgetRange' => 'annual_budget_range',
            'contactName' => 'contact_name',
            'contactPosition' => 'contact_position',
            'contactEmail' => 'contact_email',
            'contactPhone' => 'contact_phone',
            'regions' => 'regions',
            'districtCoverage' => 'district_coverage',
            'coverageScope' => 'coverage_scope',
            'countries' => 'countries',
            'sectors' => 'sectors',
            'valueChains' => 'value_chains',
            'expertise' => 'expertise',
            'featured' => 'featured',
            'published' => 'published',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (! $updating && isset($data['name'])) {
            $attrs['slug'] = $data['slug'] ?? $data['name'];
        }

        return $attrs;
    }

    /** Keys a pending revision must carry so approval can re-sync them. */
    protected function relationKeys(): array
    {
        return [
            'technologyIds',
            'themeIds',
            'projectIds',
        ];
    }

    protected function syncRelations(Model $model, array $data): void
    {
        /** @var Partner $model */
        if (array_key_exists('technologyIds', $data)) {
            $model->technologies()->sync($this->idsForSlugs(Technology::class, $data['technologyIds'] ?? []));
        }
        if (array_key_exists('themeIds', $data)) {
            $model->themes()->sync($this->idsForSlugs(Theme::class, $data['themeIds'] ?? []));
        }
        if (array_key_exists('projectIds', $data)) {
            $ids = $this->idsForSlugs(Project::class, $data['projectIds'] ?? []);
            $model->projects()->sync(array_fill_keys($ids, ['role' => 'implementing']));
        }
    }
}
