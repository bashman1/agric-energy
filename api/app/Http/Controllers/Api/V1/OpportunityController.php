<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\OpportunityResource;
use App\Models\Opportunity;
use Illuminate\Http\Request;

class OpportunityController extends ContentController
{
    protected string $modelClass = Opportunity::class;
    protected string $resourceClass = OpportunityResource::class;
    protected array $searchable = ['title', 'summary', 'description', 'funder', 'sector'];
    protected array $filters = [
        'sector' => 'sector',
        'valueChain' => 'value_chain',
        'region' => 'region',
        'featured' => 'featured',
        'type' => 'opportunity_type',
    ];
    protected string $orderBy = 'deadline';
    protected string $orderDir = 'asc';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'deadline' => 'nullable|date',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'opportunityType' => 'opportunity_type',
            'funder' => 'funder',
            'summary' => 'summary',
            'description' => 'description',
            'amount' => 'amount',
            'currency' => 'currency',
            'sector' => 'sector',
            'valueChain' => 'value_chain',
            'region' => 'region',
            'deadline' => 'deadline',
            'eligibility' => 'eligibility',
            'externalUrl' => 'external_url',
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
