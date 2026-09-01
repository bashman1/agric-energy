<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Policy;
use App\Models\Post;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use App\Models\Theme;
use App\Models\User;
use App\Notifications\ContentEndorsedNotification;
use App\Notifications\ContentPublishedNotification;
use App\Notifications\ContentRejectedNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Editorial workflow transitions and the reviewer queue.
 *
 * Two kinds of thing reach a reviewer:
 *
 *  - a record that has never been published, sitting at `pending`; approving
 *    it publishes it;
 *  - a revision — an edit an author made to a record that is already live.
 *    The live version is untouched while it waits, and approval applies the
 *    revision's payload to it (see ContentRevision).
 *
 * Approving is gated on ContentPolicy::review(), which refuses to let anyone
 * sign off their own work. Every transition is recorded in the activity log,
 * and the author is notified either way.
 */
class WorkflowController extends Controller
{
    /** URL type slug => content model. */
    private const TYPES = [
        'projects' => Project::class,
        'technologies' => Technology::class,
        'themes' => Theme::class,
        'partners' => Partner::class,
        'resources' => Resource::class,
        'events' => Event::class,
        'opportunities' => Opportunity::class,
        'policies' => Policy::class,
        'posts' => Post::class,
    ];

    /** Items awaiting review — new submissions and edits to live records. */
    public function queue(Request $request): JsonResponse
    {
        $this->authorize('review-queue');

        $types = $request->filled('type')
            ? [$request->query('type') => $this->model($request->query('type'))]
            : self::TYPES;

        $out = [];

        foreach ($types as $slug => $modelClass) {
            $items = $modelClass::pendingReview()
                ->with('author')
                ->orderBy('created_at')
                ->get();

            foreach ($items as $item) {
                $out[] = [
                    'kind' => 'submission',
                    'type' => $slug,
                    'slug' => $item->slug,
                    'title' => $item->title ?? $item->name,
                    'workflowStatus' => $item->workflow_status,
                    'author' => $item->author?->name,
                    'submittedAt' => optional($item->created_at)->toISOString(),
                ];
            }

            // Edits queued against records of this type that are already live.
            $revisions = ContentRevision::pending()
                ->where('revisable_type', $modelClass)
                ->with(['author', 'revisable'])
                ->orderBy('created_at')
                ->get();

            foreach ($revisions as $revision) {
                if (! $revision->revisable) {
                    continue; // record deleted out from under the revision
                }

                $out[] = [
                    'kind' => 'revision',
                    'revisionId' => $revision->id,
                    'type' => $slug,
                    'slug' => $revision->revisable->slug,
                    'title' => $revision->revisable->title ?? $revision->revisable->name,
                    'workflowStatus' => 'revision_pending',
                    'author' => $revision->author?->name,
                    'submittedAt' => optional($revision->created_at)->toISOString(),
                    'changedFields' => array_keys($revision->attributesPayload()),
                ];
            }
        }

        return response()->json(['data' => $out, 'total' => count($out)]);
    }

    /** Partner submits their own draft for review. */
    public function submit(Request $request, string $type, string $slug): JsonResponse
    {
        $model = $this->find($type, $slug);
        $this->authorize('update', $model);

        $model->update([
            'workflow_status' => $model::STATUS_PENDING,
            'published' => false,
        ]);
        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('submitted')->log('Submitted for review');

        return $this->ok($model);
    }

    public function approve(Request $request, string $type, string $slug): JsonResponse
    {
        $model = $this->find($type, $slug);
        $this->authorize('review', $model);

        $model->update([
            'workflow_status' => $model::STATUS_PUBLISHED,
            'published' => true,
            'review_notes' => $request->input('notes'),
            'reviewed_at' => Carbon::now(),
        ]);
        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('approved')->log('Approved and published');

        $this->notifyNominatedPartners($model, $type, $request->user()?->name);
        $this->notifyAuthor($model, $type, published: true, notes: $request->input('notes'), actor: $request->user());

        return $this->ok($model);
    }

    public function reject(Request $request, string $type, string $slug): JsonResponse
    {
        $model = $this->find($type, $slug);
        $this->authorize('review', $model);

        $data = $request->validate(['notes' => 'required|string|max:2000']);

        $model->update([
            'workflow_status' => $model::STATUS_REJECTED,
            'published' => false,
            'review_notes' => $data['notes'],
            'reviewed_at' => Carbon::now(),
        ]);
        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('rejected')->log('Rejected: ' . $data['notes']);

        $this->notifyAuthor($model, $type, published: false, notes: $data['notes'], actor: $request->user());

        return $this->ok($model);
    }

    // ── Organisation-level sign-off ───────────────────────────────────
    //
    // The stage before the platform queue: an organisation's administrator
    // vouches for a colleague's submission, and only then is NREP asked to
    // review it. Everything here is scoped to the caller's own partner_id —
    // an organisation admin never sees, or acts on, another organisation's
    // drafts.

    /** Submissions from the caller's organisation awaiting their sign-off. */
    public function orgQueue(Request $request): JsonResponse
    {
        $this->authorize('org-review-queue');

        $user = $request->user();
        $colleagueIds = User::where('partner_id', $user->partner_id)->pluck('id');

        $out = [];

        foreach (self::TYPES as $slug => $modelClass) {
            $items = $modelClass::awaitingOrgApproval()
                ->whereIn('created_by', $colleagueIds)
                ->with('author')
                ->orderBy('created_at')
                ->get();

            foreach ($items as $item) {
                $out[] = [
                    'type' => $slug,
                    'slug' => $item->slug,
                    'title' => $item->title ?? $item->name,
                    'summary' => $item->getAttribute('summary'),
                    'workflowStatus' => $item->workflow_status,
                    'author' => $item->author?->name,
                    // An admin cannot sign off their own submission, and the
                    // queue says so rather than letting them press a button
                    // the API will refuse.
                    'isMine' => (int) $item->created_by === (int) $user->id,
                    'submittedAt' => optional($item->created_at)->toISOString(),
                ];
            }
        }

        usort($out, fn ($a, $b) => strcmp($a['submittedAt'] ?? '', $b['submittedAt'] ?? ''));

        return response()->json(['data' => $out, 'total' => count($out)]);
    }

    /**
     * Organisation admin endorses a submission: it now enters the platform
     * review queue. It does NOT become public here — publishing remains an
     * NREP decision, which is the point of keeping the two stages distinct.
     */
    public function orgApprove(Request $request, string $type, string $slug): JsonResponse
    {
        $model = $this->find($type, $slug);
        $this->authorize('approveForOrg', $model);

        $model->update([
            'workflow_status' => $model::STATUS_PENDING,
            'published' => false,
        ]);

        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('org_approved')->log('Endorsed by the organisation; sent for platform review');

        $this->notifyAuthorOfOrgDecision($model, $type, endorsed: true, notes: $request->input('notes'), actor: $request->user());

        return $this->ok($model);
    }

    /**
     * Organisation admin returns a submission to its author with notes. It
     * never reaches the platform queue, and the author picks it up from the
     * portal exactly as they would a platform rejection.
     */
    public function orgReturn(Request $request, string $type, string $slug): JsonResponse
    {
        $model = $this->find($type, $slug);
        $this->authorize('approveForOrg', $model);

        $data = $request->validate(['notes' => 'required|string|max:2000']);

        $model->update([
            'workflow_status' => $model::STATUS_REJECTED,
            'published' => false,
            'review_notes' => $data['notes'],
            'reviewed_at' => Carbon::now(),
        ]);

        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('org_returned')->log('Returned by the organisation: ' . $data['notes']);

        $this->notifyAuthorOfOrgDecision($model, $type, endorsed: false, notes: $data['notes'], actor: $request->user());

        return $this->ok($model);
    }

    // ── Revisions to live records ─────────────────────────────────────

    /** Apply a pending edit to the live record it was raised against. */
    public function approveRevision(Request $request, int $id): JsonResponse
    {
        $revision = ContentRevision::pending()->with('revisable')->findOrFail($id);
        $model = $revision->revisable;

        if (! $model) {
            return response()->json(['error' => 'The record this edit belongs to no longer exists.'], 410);
        }

        $this->authorize('review', $model);

        $model->update($revision->attributesPayload());
        $this->applyRevisionRelations($model, $revision);

        $revision->update([
            'status' => ContentRevision::STATUS_APPROVED,
            'reviewed_by' => $request->user()?->id,
            'review_notes' => $request->input('notes'),
            'reviewed_at' => Carbon::now(),
        ]);

        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('revision_approved')->log('Edit approved and applied');

        $type = $this->typeFor($model);
        $this->notifyNominatedPartners($model, $type, $request->user()?->name);
        $this->notifyAuthorOfRevision($revision, $model, $type, approved: true, notes: $request->input('notes'));

        return $this->ok($model);
    }

    /** Discard a pending edit; the live record is already untouched. */
    public function rejectRevision(Request $request, int $id): JsonResponse
    {
        $revision = ContentRevision::pending()->with('revisable')->findOrFail($id);
        $model = $revision->revisable;

        if (! $model) {
            return response()->json(['error' => 'The record this edit belongs to no longer exists.'], 410);
        }

        $this->authorize('review', $model);

        $data = $request->validate(['notes' => 'required|string|max:2000']);

        $revision->update([
            'status' => ContentRevision::STATUS_REJECTED,
            'reviewed_by' => $request->user()?->id,
            'review_notes' => $data['notes'],
            'reviewed_at' => Carbon::now(),
        ]);

        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('revision_rejected')->log('Edit returned: ' . $data['notes']);

        $this->notifyAuthorOfRevision($revision, $model, $this->typeFor($model), approved: false, notes: $data['notes']);

        return $this->ok($model);
    }

    /**
     * Re-sync a revision's many-to-many slug arrays onto the model.
     *
     * Routed back through the owning controller so the mapping from payload
     * key to relationship stays defined in exactly one place — the same
     * syncRelations() that handles a direct edit.
     */
    private function applyRevisionRelations(Model $model, ContentRevision $revision): void
    {
        $relations = $revision->relationsPayload();

        if ($relations === []) {
            return;
        }

        $controller = $this->controllerFor($model);

        if ($controller === null) {
            return;
        }

        $sync = (new \ReflectionClass($controller))->getMethod('syncRelations');
        $sync->setAccessible(true);
        $sync->invoke($controller, $model, $relations);
    }

    private function controllerFor(Model $model): ?ContentController
    {
        $map = [
            Project::class => ProjectController::class,
            Technology::class => TechnologyController::class,
            Theme::class => ThemeController::class,
            Partner::class => PartnerController::class,
            Resource::class => ResourceController::class,
        ];

        $class = $map[$model::class] ?? null;

        return $class ? app($class) : null;
    }

    // ── Notifications ─────────────────────────────────────────────────

    /**
     * Tell the partners nominated on the record that it is live.
     *
     * Wrapped because a mail or database failure must not roll back an
     * approval a reviewer has already made.
     */
    private function notifyNominatedPartners(Model $model, string $type, ?string $actorName): void
    {
        try {
            $partnerSlugs = $model->getAttribute('notify_partner_ids') ?? [];

            if (empty($partnerSlugs)) {
                return;
            }

            $partners = Partner::whereIn('slug', $partnerSlugs)->get();

            foreach ($partners as $partner) {
                foreach (User::where('partner_id', $partner->id)->get() as $user) {
                    $user->notify(new ContentPublishedNotification($model, $type, $actorName));
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Tell the author what happened to their submission.
     *
     * A rejection previously reached nobody: the contributor found out by
     * going back to the portal and noticing the status, and the reviewer's
     * notes went unread. Both outcomes are notified now.
     */
    private function notifyAuthor(Model $model, string $type, bool $published, ?string $notes, ?User $actor): void
    {
        try {
            $author = $model->author;

            if (! $author || ($actor && $author->id === $actor->id)) {
                return; // nobody to tell, or they just did it themselves
            }

            $author->notify($published
                ? new ContentPublishedNotification($model, $type, $actor?->name)
                : new ContentRejectedNotification($model, $type, $notes ?? '', $actor?->name));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Tell the author what their own organisation decided.
     *
     * An endorsement is not a publication, so it deliberately does NOT reuse
     * ContentPublishedNotification — telling an author their draft is live
     * when it has only cleared the first of two gates is worse than telling
     * them nothing.
     */
    private function notifyAuthorOfOrgDecision(Model $model, string $type, bool $endorsed, ?string $notes, ?User $actor): void
    {
        try {
            $author = $model->author;

            if (! $author || ($actor && $author->id === $actor->id)) {
                return;
            }

            $author->notify($endorsed
                ? new ContentEndorsedNotification($model, $type, $actor?->name)
                : new ContentRejectedNotification($model, $type, $notes ?? '', $actor?->name));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyAuthorOfRevision(ContentRevision $revision, Model $model, string $type, bool $approved, ?string $notes): void
    {
        try {
            $author = $revision->author;

            if (! $author) {
                return;
            }

            $author->notify($approved
                ? new ContentPublishedNotification($model, $type, $revision->reviewer?->name)
                : new ContentRejectedNotification($model, $type, $notes ?? '', $revision->reviewer?->name));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // ── Plumbing ──────────────────────────────────────────────────────

    private function ok(Model $model): JsonResponse
    {
        return response()->json(['data' => [
            'slug' => $model->slug,
            'workflowStatus' => $model->workflow_status,
            'published' => (bool) $model->published,
            'reviewNotes' => $model->review_notes,
        ]]);
    }

    /** @return class-string<Model> */
    private function model(string $type): string
    {
        return self::TYPES[$type] ?? throw new NotFoundHttpException("Unknown content type: {$type}");
    }

    private function typeFor(Model $model): string
    {
        return array_search($model::class, self::TYPES, true) ?: 'content';
    }

    private function find(string $type, string $slug): Model
    {
        return $this->model($type)::where('slug', $slug)->firstOrFail();
    }
}
