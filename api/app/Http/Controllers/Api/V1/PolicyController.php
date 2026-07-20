<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\PolicyResource;
use App\Models\Policy;
use Illuminate\Http\Request;

class PolicyController extends ContentController
{
    protected string $modelClass = Policy::class;
    protected string $resourceClass = PolicyResource::class;
    protected array $searchable = ['title', 'summary', 'description'];
    protected array $filters = [
        'category' => 'category',
        'featured' => 'featured',
    ];
    protected string $orderBy = 'publication_date';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'category' => 'category',
            'summary' => 'summary',
            'description' => 'description',
            'documentUrl' => 'document_url',
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
}
