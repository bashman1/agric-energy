<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ThemeResource;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ThemeController extends ContentController
{
    protected string $modelClass = Theme::class;
    protected string $resourceClass = ThemeResource::class;
    protected array $with = ['technologies', 'projects', 'resources'];
    protected array $searchable = ['name', 'summary', 'description'];
    protected array $filters = [
        'featured' => 'featured',
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
            'icon' => 'icon',
            'summary' => 'summary',
            'description' => 'description',
            'whyItMatters' => 'why_it_matters',
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
        /** @var Theme $model */
        if (array_key_exists('relatedTechnologyIds', $data)) {
            $model->technologies()->sync($this->idsForSlugs(Technology::class, $data['relatedTechnologyIds'] ?? []));
        }
        if (array_key_exists('relatedProjectIds', $data)) {
            $model->projects()->sync($this->idsForSlugs(Project::class, $data['relatedProjectIds'] ?? []));
        }
        if (array_key_exists('relatedResourceIds', $data)) {
            $model->resources()->sync($this->idsForSlugs(Resource::class, $data['relatedResourceIds'] ?? []));
        }
    }
}
