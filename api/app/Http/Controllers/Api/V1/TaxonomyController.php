<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TaxonomyItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Returns the taxonomy grouped in the prototype's camelCase shape
 * ({ valueChains: [...], projectStatuses: [...], ... }).
 */
class TaxonomyController extends Controller
{
    /** snake_case group => camelCase JSON key. */
    private const GROUP_KEYS = [
        'value_chains' => 'valueChains',
        'project_statuses' => 'projectStatuses',
        'resource_types' => 'resourceTypes',
        'partner_types' => 'partnerTypes',
        'technology_categories' => 'technologyCategories',
        'beneficiary_tags' => 'beneficiaryTags',
    ];

    public function index(): JsonResponse
    {
        $items = TaxonomyItem::orderBy('sort')->get()->groupBy('group');

        $out = [];
        foreach (self::GROUP_KEYS as $group => $key) {
            $out[$key] = ($items[$group] ?? collect())
                ->map(fn ($i) => ['id' => (string) $i->id, 'name' => $i->name, 'slug' => $i->slug])
                ->values();
        }

        return response()->json(['data' => $out]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('manage', TaxonomyItem::class);

        $payload = $request->all();

        foreach (self::GROUP_KEYS as $group => $key) {
            if (! array_key_exists($key, $payload)) {
                continue;
            }
            TaxonomyItem::where('group', $group)->delete();
            foreach ($payload[$key] as $i => $item) {
                TaxonomyItem::create([
                    'group' => $group,
                    'name' => $item['name'],
                    'slug' => $item['slug'] ?? Str::slug($item['name']),
                    'sort' => $i,
                ]);
            }
        }

        return $this->index();
    }
}
