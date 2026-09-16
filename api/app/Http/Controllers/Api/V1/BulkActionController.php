<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\NotifiesAboutContent;
use App\Http\Controllers\Controller;
use App\Support\ContentTypes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

/**
 * Delete / publish / unpublish several records of one content type at once,
 * from the admin list tables.
 *
 * The rule this controller exists to enforce: a bulk action is exactly the
 * single-record action repeated, never a cheaper version of it. Each record
 * is authorized on its own, each gets its own activity-log entry, and a bulk
 * publish sends the same notifications an approval from the review queue
 * sends. Anything less would make the list view a documented way around the
 * editorial workflow.
 *
 * PARTIAL SUCCESS IS THE NORMAL CASE. Someone selecting twenty rows will
 * routinely include one they may not touch — a live record they authored, a
 * colleague's draft. Refusing the whole batch for that would teach people to
 * select one row at a time, so records the caller may act on go through and
 * the response names the ones that did not and why. The caller is told, per
 * slug, rather than being left to compare counts.
 */
class BulkActionController extends Controller
{
    use NotifiesAboutContent;

    private const ACTIONS = ['delete', 'publish', 'unpublish'];

    /** How many records one request may act on. */
    private const MAX_ITEMS = 200;

    public function store(Request $request, string $type): JsonResponse
    {
        $modelClass = ContentTypes::modelFor($type);

        if ($modelClass === null) {
            return response()->json(['error' => "Unknown content type '{$type}'."], 404);
        }

        $data = $request->validate([
            'action' => ['required', 'string', 'in:' . implode(',', self::ACTIONS)],
            'slugs' => ['required', 'array', 'min:1', 'max:' . self::MAX_ITEMS],
            'slugs.*' => ['required', 'string'],
        ]);

        $action = $data['action'];
        $slugs = array_values(array_unique($data['slugs']));

        $models = $modelClass::with('author')->whereIn('slug', $slugs)->get()->keyBy('slug');

        $succeeded = [];
        $failed = [];

        foreach ($slugs as $slug) {
            $model = $models->get($slug);

            if (! $model) {
                // Already gone is the outcome a delete was asking for, so it
                // is not worth reporting as a failure the user must act on.
                if ($action === 'delete') {
                    $succeeded[] = $slug;
                } else {
                    $failed[] = ['slug' => $slug, 'reason' => 'No longer exists.'];
                }
                continue;
            }

            $refusal = $this->refusalFor($request, $action, $model);

            if ($refusal !== null) {
                $failed[] = ['slug' => $slug, 'reason' => $refusal];
                continue;
            }

            $this->apply($request, $action, $type, $model);
            $succeeded[] = $slug;
        }

        return response()->json([
            'data' => [
                'action' => $action,
                'type' => $type,
                'succeeded' => $succeeded,
                'failed' => $failed,
            ],
            'message' => $this->summarise($action, count($succeeded), count($failed)),
        ]);
    }

    /**
     * Why this caller may not perform this action on this record, or null if
     * they may.
     *
     * Returns a sentence rather than a boolean because the list view has to
     * explain a partial result, and "3 of 8 failed" with no reason is a bug
     * report waiting to happen.
     */
    private function refusalFor(Request $request, string $action, Model $model): ?string
    {
        $user = $request->user();

        if ($action === 'delete') {
            return Gate::forUser($user)->allows('delete', $model)
                ? null
                : ($model->published
                    ? 'It is live — a published record can only be deleted by a content manager.'
                    : 'You do not have permission to delete it.');
        }

        // publish / unpublish
        if (! Gate::forUser($user)->allows('publish', $model)) {
            return 'Publishing is a content-manager action.';
        }

        // A record still waiting in the review queue is a submission, and
        // clearing it is an approval. ContentPolicy::review() refuses to let
        // anyone sign off their own work, and publishing straight from the
        // list must not be the way around that — otherwise a knowledge
        // manager could write ten records, tick them all, and publish their
        // own submissions unreviewed.
        if ($action === 'publish' && $this->awaitingReview($model)) {
            return Gate::forUser($user)->allows('review', $model)
                ? null
                : 'It is awaiting review and you submitted it — someone else has to approve it.';
        }

        return null;
    }

    /** Whether the record is sitting in a review queue rather than being a plain draft. */
    private function awaitingReview(Model $model): bool
    {
        return in_array($model->getAttribute('workflow_status'), [
            $model::STATUS_ORG_PENDING,
            $model::STATUS_PENDING,
            $model::STATUS_IN_REVIEW,
        ], true);
    }

    private function apply(Request $request, string $action, string $type, Model $model): void
    {
        $actor = $request->user();

        if ($action === 'delete') {
            $model->delete();
            activity('content')->performedOn($model)->causedBy($actor)
                ->event('deleted')->log('Deleted in a bulk action');

            return;
        }

        if ($action === 'publish') {
            // `published` and `workflow_status` move together. Setting the
            // flag alone would leave the record live while the review queue
            // still lists it as pending, and a reviewer would then "approve"
            // something the public has been reading for a week.
            $model->update([
                'workflow_status' => $model::STATUS_PUBLISHED,
                'published' => true,
                'reviewed_at' => Carbon::now(),
            ]);
            activity('content')->performedOn($model)->causedBy($actor)
                ->event('approved')->log('Published in a bulk action');

            $this->notifyNominatedPartners($model, $type, $actor?->name);
            $this->notifyAuthor($model, $type, published: true, notes: null, actor: $actor);

            return;
        }

        // Unpublish. Back to a draft rather than `rejected`: taking a record
        // off the site is an editorial decision about timing, not a judgement
        // on the author's work, and it carries no review notes to explain
        // itself. Sending them a rejection notice would be a lie, so this
        // transition deliberately notifies nobody — the audit entry is the
        // record of who did it.
        $model->update([
            'workflow_status' => $model::STATUS_DRAFT,
            'published' => false,
        ]);
        activity('content')->performedOn($model)->causedBy($actor)
            ->event('unpublished')->log('Unpublished in a bulk action');
    }

    private function summarise(string $action, int $ok, int $failed): string
    {
        $verb = match ($action) {
            'delete' => 'deleted',
            'publish' => 'published',
            default => 'unpublished',
        };

        $record = $ok === 1 ? 'record' : 'records';

        if ($failed === 0) {
            return "{$ok} {$record} {$verb}.";
        }

        if ($ok === 0) {
            return "Nothing was {$verb}: " . ($failed === 1 ? '1 record was skipped.' : "{$failed} records were skipped.");
        }

        return "{$ok} {$record} {$verb}; {$failed} skipped.";
    }
}
