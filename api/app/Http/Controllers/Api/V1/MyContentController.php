<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Partner self-service: the authenticated user's own content submissions
 * across every type they can contribute, with workflow status. Partners see
 * ONLY records they authored (never other authors' drafts).
 */
class MyContentController extends Controller
{
    /** Content types a partner may contribute. */
    private const TYPES = [
        'projects' => Project::class,
        'technologies' => Technology::class,
        'resources' => Resource::class,
        'partners' => Partner::class,
        'events' => Event::class,
        'opportunities' => Opportunity::class,
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $out = [];

        foreach (self::TYPES as $slug => $modelClass) {
            $items = $modelClass::where('created_by', $user->id)
                ->orderByDesc('updated_at')
                ->get();

            foreach ($items as $item) {
                $out[] = [
                    'type' => $slug,
                    'slug' => $item->slug,
                    'title' => $item->title ?? $item->name,
                    'workflowStatus' => $item->workflow_status,
                    'published' => (bool) $item->published,
                    'reviewNotes' => $item->review_notes,
                    'updatedAt' => optional($item->updated_at)->toISOString(),
                ];
            }
        }

        // Newest first across all types.
        usort($out, fn ($a, $b) => strcmp($b['updatedAt'] ?? '', $a['updatedAt'] ?? ''));

        return response()->json(['data' => $out, 'total' => count($out)]);
    }
}
