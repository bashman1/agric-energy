<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\TechnologyResource;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TechnologyController extends ContentController
{
    protected string $modelClass = Technology::class;
    protected string $resourceClass = TechnologyResource::class;
    protected array $with = ['projects', 'resources'];
    protected array $searchable = ['name', 'summary', 'description'];
    protected array $filters = [
        'category' => 'category',
        'featured' => 'featured',
    ];
    protected array $relationFilters = [
        'themeId' => ['themes', 'slug'],
    ];

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'name' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'summary' => 'nullable|string|max:2000',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'name' => 'name',
            'category' => 'category',
            'summary' => 'summary',
            'description' => 'description',
            'applications' => 'applications',
            'benefits' => 'benefits',
            'limitations' => 'limitations',
            'operationalNotes' => 'operational_notes',
            'maintenanceNotes' => 'maintenance_notes',
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

    protected function syncRelations(Model $model, array $data): void
    {
        /** @var Technology $model */
        if (array_key_exists('relatedProjectIds', $data)) {
            $model->projects()->sync($this->idsForSlugs(Project::class, $data['relatedProjectIds'] ?? []));
        }
        if (array_key_exists('relatedResourceIds', $data)) {
            $model->resources()->sync($this->idsForSlugs(Resource::class, $data['relatedResourceIds'] ?? []));
        }
    }
}
