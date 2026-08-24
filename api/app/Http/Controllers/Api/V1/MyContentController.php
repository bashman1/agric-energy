<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Partner self-service: the content submissions this account may see, across
 * every type it can contribute, with workflow status.
 *
 * Scope depends on what the account is. A lone contributor sees what they
 * authored and nothing else. An account holding an organisation-scoped role
 * sees its ORGANISATION's submissions — records belong to the organisation
 * that contributed them, not to whichever colleague happened to fill in the
 * form, and scoping per-user meant a submission became unreachable the moment
 * its author was on leave or left the organisation.
 *
 * Nobody ever sees another organisation's drafts.
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
        $authorIds = $this->visibleAuthorIds($user);
        $out = [];

        foreach (self::TYPES as $slug => $modelClass) {
            $items = $modelClass::whereIn('created_by', $authorIds)
                ->with('author')
                ->orderByDesc('updated_at')
                ->get();

            foreach ($items as $item) {
                $pending = $item->pendingRevision();

                $out[] = [
                    'type' => $slug,
                    'slug' => $item->slug,
                    'title' => $item->title ?? $item->name,
                    'workflowStatus' => $item->workflow_status,
                    'published' => (bool) $item->published,
                    'reviewNotes' => $item->review_notes,
                    // Whose submission this is, so a shared organisation view
                    // is readable rather than an undifferentiated list.
                    'author' => $item->author?->name,
                    'isMine' => (int) $item->created_by === (int) $user->id,
                    // A live record can have an edit waiting behind it; the
                    // dashboard needs to say so, or the contributor thinks
                    // their change was lost.
                    'pendingEdit' => $pending ? [
                        'id' => $pending->id,
                        'submittedAt' => optional($pending->created_at)->toISOString(),
                    ] : null,
                    'updatedAt' => optional($item->updated_at)->toISOString(),
                ];
            }
        }

        // Newest first across all types.
        usort($out, fn ($a, $b) => strcmp($b['updatedAt'] ?? '', $a['updatedAt'] ?? ''));

        return response()->json(['data' => $out, 'total' => count($out)]);
    }

    /**
     * The author ids whose records this account may see.
     *
     * @return int[]
     */
    private function visibleAuthorIds(User $user): array
    {
        if ($user->partner_id === null || ! $user->hasAnyRole(Roles::PARTNER_TEAM_ROLES)) {
            return [$user->id];
        }

        return User::where('partner_id', $user->partner_id)->pluck('id')->all();
    }
}
