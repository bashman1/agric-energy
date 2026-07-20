<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Policy;
use App\Models\Post;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Editorial workflow transitions and the reviewer queue.
 *
 * Flow: a partner's content is created `pending`; a reviewer/editor approves
 * (→ published) or rejects (→ rejected, with notes). Every transition is
 * recorded in the activity log.
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

    /** Items awaiting review, optionally filtered by ?type=. */
    public function queue(Request $request): JsonResponse
    {
        $this->authorize('viewAny'); // editors + reviewers gate

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
                    'type' => $slug,
                    'slug' => $item->slug,
                    'title' => $item->title ?? $item->name,
                    'workflowStatus' => $item->workflow_status,
                    'author' => $item->author?->name,
                    'submittedAt' => optional($item->created_at)->toISOString(),
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

        return $this->ok($model);
    }

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

    private function find(string $type, string $slug): Model
    {
        return $this->model($type)::where('slug', $slug)->firstOrFail();
    }
}
