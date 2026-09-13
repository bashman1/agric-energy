<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\OpportunityResource;
use App\Http\Resources\PartnerResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\ResourceResource;
use App\Http\Resources\TechnologyResource;
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

    /**
     * How each type is shaped for the client. The same resources the public
     * API uses, so a submission under review reads exactly as it will once
     * published — a reviewer should be looking at the finished article, not a
     * different rendering of it.
     */
    private const RESOURCES = [
        'projects' => ProjectResource::class,
        'technologies' => TechnologyResource::class,
        'resources' => ResourceResource::class,
        'partners' => PartnerResource::class,
        'events' => EventResource::class,
        'opportunities' => OpportunityResource::class,
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
     * One of those submissions, in full.
     *
     * Without this an organisation's reviewer had the list and nothing else:
     * a title, a truncated summary, and two buttons. Endorsing a colleague's
     * work means sending it to NREP over the organisation's name, and there
     * was no way to read the thing first — the public detail page is no help
     * because the record is unpublished, and the admin API refuses anyone who
     * is not platform staff.
     *
     * Scoped exactly as the list is: the caller's own organisation, never
     * another's. Read-only — endorsing still goes through orgApprove(), which
     * keeps the author out of their own sign-off.
     */
    public function show(Request $request, string $type, string $slug): JsonResponse
    {
        $user = $request->user();

        $modelClass = self::TYPES[$type] ?? null;
        abort_if($modelClass === null, 404, 'Unknown content type.');

        $item = $modelClass::where('slug', $slug)
            ->whereIn('created_by', $this->visibleAuthorIds($user))
            ->with('author')
            ->first();

        // 404 rather than 403 on another organisation's record: whether it
        // exists is not this caller's business either.
        abort_if($item === null, 404, 'Not found.');

        $resourceClass = self::RESOURCES[$type];

        return response()->json([
            'data' => (new $resourceClass($item))->toArray($request) + [
                'author' => $item->author?->name,
                'isMine' => (int) $item->created_by === (int) $user->id,
            ],
        ]);
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
