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
        'subcategory' => 'subcategory',
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
            'subcategory' => 'subcategory',
            'summary' => 'summary',
            'description' => 'description',
            'featuredImage' => 'featured_image',
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

        foreach (self::LIST_COLUMNS as $col) {
            if (array_key_exists($col, $attrs)) {
                $attrs[$col] = $this->toList($attrs[$col]);
            }
        }

        if (! $updating && isset($data['name'])) {
            $attrs['slug'] = $data['slug'] ?? $data['name'];
        }

        return $attrs;
    }

    /** Columns the public page renders as bullet lists (string[]). */
    private const LIST_COLUMNS = ['applications', 'benefits', 'limitations', 'operational_notes', 'maintenance_notes'];

    /**
     * Coerce a list field to string[].
     *
     * The admin form sends arrays, but the partner form sends these as free
     * textareas (one string), and groups the operational fields into an
     * object ({ amountUsed, technologyStatus, notes }). Stored as-is, the
     * public page called .map() on a string and crashed. One line per item,
     * and grouped fields become "Label: value" lines.
     */
    private function toList(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map('trim', preg_split('/\R/', $value))));
        }

        if (! is_array($value)) {
            return [];
        }

        if (array_is_list($value)) {
            return array_values(array_filter(array_map(fn ($v) => trim((string) $v), $value)));
        }

        $labels = ['amountUsed' => 'Amount used', 'technologyStatus' => 'Technology status'];
        $out = [];
        foreach ($value as $key => $v) {
            if (is_array($v) || trim((string) $v) === '') {
                continue;
            }
            if (isset($labels[$key])) {
                $out[] = $labels[$key] . ': ' . ucfirst(trim((string) $v));
            } else {
                array_push($out, ...$this->toList((string) $v));
            }
        }

        return $out;
    }

    /** Keys a pending revision must carry so approval can re-sync them. */
    protected function relationKeys(): array
    {
        return [
            'relatedProjectIds',
            'relatedResourceIds',
        ];
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
