<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ProjectResource;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectController extends ContentController
{
    protected string $modelClass = Project::class;
    protected string $resourceClass = ProjectResource::class;
    protected array $with = ['technologies', 'themes', 'partners'];
    protected array $searchable = ['title', 'summary', 'description', 'region', 'district', 'location_note'];
    protected array $filters = [
        'region' => 'region',
        'district' => 'district',
        'valueChain' => 'value_chain',
        'status' => 'status',
        'featured' => 'featured',
    ];
    protected array $relationFilters = [
        'technologyId' => ['technologies', 'slug'],
        'themeId' => ['themes', 'slug'],
        'partnerId' => ['partners', 'slug'],
    ];

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'summary' => 'nullable|string|max:2000',
            'coordinates.lat' => 'nullable|numeric',
            'coordinates.lng' => 'nullable|numeric',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'summary' => 'summary',
            'description' => 'description',
            'region' => 'region',
            'district' => 'district',
            'regions' => 'regions',
            'districts' => 'districts',
            'locationNote' => 'location_note',
            'fundingPartner' => 'funding_partner',
            'budget' => 'budget',
            'budgetCurrency' => 'budget_currency',
            'beneficiaryCount' => 'beneficiary_count',
            'valueChain' => 'value_chain',
            'beneficiaries' => 'beneficiaries',
            'status' => 'status',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'outcomes' => 'outcomes',
            'featuredImage' => 'featured_image',
            'gallery' => 'gallery',
            'attachments' => 'attachments',
            'externalUrl' => 'external_url',
            'featured' => 'featured',
            'published' => 'published',
            'notifyPartnerIds' => 'notify_partner_ids',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (isset($data['coordinates'])) {
            $attrs['lat'] = $data['coordinates']['lat'] ?? null;
            $attrs['lng'] = $data['coordinates']['lng'] ?? null;
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        return $attrs;
    }

    /** Keys a pending revision must carry so approval can re-sync them. */
    protected function relationKeys(): array
    {
        return [
            'technologyIds',
            'themeIds',
            'implementingPartnerIds',
        ];
    }

    protected function syncRelations(Model $model, array $data): void
    {
        /** @var Project $model */
        if (array_key_exists('technologyIds', $data)) {
            $model->technologies()->sync($this->idsForSlugs(Technology::class, $data['technologyIds'] ?? []));
        }
        if (array_key_exists('themeIds', $data)) {
            $model->themes()->sync($this->idsForSlugs(Theme::class, $data['themeIds'] ?? []));
        }
        if (array_key_exists('implementingPartnerIds', $data)) {
            $ids = $this->idsForSlugs(Partner::class, $data['implementingPartnerIds'] ?? []);
            $model->partners()->sync(array_fill_keys($ids, ['role' => 'implementing']));
        }
    }
}
