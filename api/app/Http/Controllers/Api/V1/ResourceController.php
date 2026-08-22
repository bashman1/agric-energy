<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ResourceResource;
use App\Models\Resource;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ResourceController extends ContentController
{
    protected string $modelClass = Resource::class;
    protected string $resourceClass = ResourceResource::class;
    protected array $with = ['themes', 'technologies'];
    protected array $searchable = ['title', 'summary', 'description'];
    protected array $filters = [
        'type' => 'type',
        'featured' => 'featured',
    ];
    protected array $relationFilters = [
        'themeId' => ['themes', 'slug'],
        'technologyId' => ['technologies', 'slug'],
    ];
    protected string $orderBy = 'publication_date';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'type' => 'nullable|string|max:100',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'type' => 'type',
            'summary' => 'summary',
            'description' => 'description',
            'featuredImage' => 'featured_image',
            'fileUrl' => 'file_url',
            'externalUrl' => 'external_url',
            'fileDownloadable' => 'file_downloadable',
            'publicationDate' => 'publication_date',
            'featured' => 'featured',
            'published' => 'published',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        return $attrs;
    }

    protected function syncRelations(Model $model, array $data): void
    {
        /** @var Resource $model */
        if (array_key_exists('themeIds', $data)) {
            $model->themes()->sync($this->idsForSlugs(Theme::class, $data['themeIds'] ?? []));
        }
        if (array_key_exists('technologyIds', $data)) {
            $model->technologies()->sync($this->idsForSlugs(Technology::class, $data['technologyIds'] ?? []));
        }
    }
}
