<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Base CRUD controller for publishable content entities. Read endpoints are
 * public (published-only unless ?admin=true and authorised); write endpoints
 * are gated by policies. Subclasses declare the model, transformer, eager
 * loads, and filter maps, and map the inbound camelCase payload to columns.
 */
abstract class ContentController extends Controller
{
    /** @var class-string<Model> */
    protected string $modelClass;

    /** @var class-string<\Illuminate\Http\Resources\Json\JsonResource> */
    protected string $resourceClass;

    /** Relationships to eager-load for serialisation. */
    protected array $with = [];

    /** Columns matched by the free-text ?search= param. */
    protected array $searchable = [];

    /** Scalar filters: request param => column. */
    protected array $filters = [];

    /** Relationship filters: request param => [relation, column]. */
    protected array $relationFilters = [];

    /** Default column to order by (desc). */
    protected string $orderBy = 'updated_at';

    protected string $orderDir = 'desc';

    public function index(Request $request): JsonResponse
    {
        $admin = $this->wantsAdmin($request);

        /** @var Builder $query */
        $query = $this->modelClass::query()->with($this->with);

        if (! $admin) {
            $query->where('published', true);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function (Builder $q) use ($search) {
                foreach ($this->searchable as $col) {
                    $q->orWhere($col, 'ilike', "%{$search}%");
                }
            });
        }

        foreach ($this->filters as $param => $column) {
            if ($request->filled($param)) {
                $value = $request->query($param);
                if ($param === 'featured') {
                    $query->where($column, filter_var($value, FILTER_VALIDATE_BOOLEAN));
                } else {
                    $query->where($column, $value);
                }
            }
        }

        foreach ($this->relationFilters as $param => [$relation, $column]) {
            if ($request->filled($param)) {
                $slug = $request->query($param);
                $query->whereHas($relation, fn (Builder $q) => $q->where($column, $slug));
            }
        }

        $query->orderBy($this->orderBy, $this->orderDir);

        $items = $query->get();

        return response()->json([
            'data' => $this->resourceClass::collection($items),
            'total' => $items->count(),
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $query = $this->modelClass::query()->with($this->with)->where('slug', $slug);

        if (! $this->wantsAdmin($request)) {
            $query->where('published', true);
        }

        $model = $query->first();

        if (! $model) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json(['data' => new $this->resourceClass($model)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', $this->modelClass);

        $data = $this->validatePayload($request);
        $attributes = $this->inboundAttributes($data);

        $attributes['slug'] = $this->uniqueSlug($attributes['slug'] ?? ($attributes['title'] ?? $attributes['name'] ?? Str::random(8)));
        $attributes['created_by'] = $request->user()?->id;
        $attributes = array_merge($attributes, $this->enforceWorkflow($request));

        /** @var Model $model */
        $model = $this->modelClass::create($attributes);
        $this->syncRelations($model, $data);
        $model->load($this->with);

        return response()->json(['data' => new $this->resourceClass($model)], 201);
    }

    public function update(Request $request, string $slug): JsonResponse
    {
        $model = $this->modelClass::where('slug', $slug)->firstOrFail();
        $this->authorize('update', $model);

        $data = $this->validatePayload($request, updating: true);
        $attributes = $this->inboundAttributes($data, updating: true);

        // An author editing a record that is already live does not get to
        // change what the public sees, and equally must not have it pulled
        // off the site while a reviewer looks: the edit is parked as a
        // pending revision and the live version is left untouched.
        if ($this->shouldRevise($request, $model)) {
            return $this->storeRevision($request, $model, $attributes, $data);
        }

        // A contributor cannot publish: any edit they make re-enters review,
        // so they can never flip `published` on their own record via update.
        $attributes = array_merge($attributes, $this->enforceWorkflow($request));
        $model->update($attributes);
        $this->syncRelations($model, $data);
        $model->load($this->with);

        return response()->json(['data' => new $this->resourceClass($model)]);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $model = $this->modelClass::where('slug', $slug)->firstOrFail();
        $this->authorize('delete', $model);
        $model->delete();

        return response()->json(['message' => 'Deleted']);
    }

    // ── Hooks for subclasses ──────────────────────────────────────────

    /** Validate + return the request payload. Override to add rules. */
    protected function validatePayload(Request $request, bool $updating = false): array
    {
        return $request->all();
    }

    /** Map the camelCase request payload to database columns. */
    abstract protected function inboundAttributes(array $data, bool $updating = false): array;

    /** Sync many-to-many relationships from slug arrays. Override as needed. */
    protected function syncRelations(Model $model, array $data): void
    {
        //
    }

    /**
     * Payload keys carrying many-to-many slug arrays, so a revision can put
     * them back through syncRelations() on approval. Override alongside
     * syncRelations() in any subclass that has relationships to sync.
     *
     * @return string[]
     */
    protected function relationKeys(): array
    {
        return [];
    }

    // ── Revisions ─────────────────────────────────────────────────────

    /**
     * Whether this edit should be parked for review rather than applied.
     *
     * Only for authors editing live records: a content manager's edit is the
     * review, and an unpublished record has no live version to protect, so
     * both go straight through.
     */
    protected function shouldRevise(Request $request, Model $model): bool
    {
        $user = $request->user();

        return $user !== null
            && ! $user->hasAnyRole(Roles::CONTENT_MANAGERS)
            && (bool) $model->getAttribute('published') === true;
    }

    /** Park the proposed attributes as a pending revision. */
    protected function storeRevision(Request $request, Model $model, array $attributes, array $data): JsonResponse
    {
        // Never let a revision carry workflow or publication columns: those
        // are the reviewer's to set, and accepting them here would be a route
        // to self-publishing through the back door.
        foreach (['published', 'workflow_status', 'featured', 'created_by', 'slug', 'reviewed_at', 'review_notes'] as $protected) {
            unset($attributes[$protected]);
        }

        $relations = [];
        foreach ($this->relationKeys() as $key) {
            if (array_key_exists($key, $data)) {
                $relations[$key] = $data[$key];
            }
        }

        if ($relations !== []) {
            $attributes[ContentRevision::RELATIONS_KEY] = $relations;
        }

        // One pending revision per record: a second edit supersedes the first
        // rather than queueing a second thing for a reviewer to reconcile.
        $revision = $model->revisions()->pending()->latest('id')->first();

        if ($revision) {
            $revision->update([
                'payload' => $attributes,
                'created_by' => $request->user()?->id,
            ]);
        } else {
            $revision = $model->revisions()->create([
                'payload' => $attributes,
                'status' => ContentRevision::STATUS_PENDING,
                'created_by' => $request->user()?->id,
            ]);
        }

        activity('content')->performedOn($model)->causedBy($request->user())
            ->event('revised')->log('Edit submitted for review');

        $model->load($this->with);

        return response()->json([
            'data' => new $this->resourceClass($model),
            'revision' => [
                'id' => $revision->id,
                'status' => $revision->status,
                'submittedAt' => optional($revision->created_at)->toISOString(),
            ],
            'message' => 'Your changes were submitted for review. The published version stays live until they are approved.',
        ], 202);
    }

    /**
     * Workflow state forced onto a record on create/update. Content managers
     * publish directly, so this is a no-op for them. Everyone else has their
     * content held unpublished — applied on update too, so a contributor can
     * never self-publish by flipping `published` in an edit payload.
     *
     * Which holding state depends on who is submitting. Content written
     * inside an organisation by someone other than its administrator stops at
     * `org_pending` first, so the organisation vouches for its own work before
     * the platform is asked to look at it. Everyone else — staff
     * contributors, individual partners, and an organisation's own
     * administrator — goes straight to `pending`.
     */
    protected function enforceWorkflow(Request $request): array
    {
        $user = $request->user();

        if (! $user || $user->hasAnyRole(Roles::CONTENT_MANAGERS)) {
            return [];
        }

        return [
            'workflow_status' => $this->needsOrgApproval($user)
                ? $this->modelClass::STATUS_ORG_PENDING
                : $this->modelClass::STATUS_PENDING,
            'published' => false,
        ];
    }

    /**
     * Whether this account's submissions need their own organisation's
     * sign-off before reaching the platform queue.
     *
     * The organisation administrator is excluded on purpose: they ARE the
     * sign-off, and ContentPolicy::approveForOrg() refuses to let anyone
     * approve their own submission, so routing their work through
     * `org_pending` would strand it with nobody able to move it on.
     *
     * An organisation with no administrator would strand its contributors'
     * work just as badly, so the stage only applies where one exists.
     */
    protected function needsOrgApproval(?User $user): bool
    {
        if ($user === null || $user->partner_id === null) {
            return false;
        }

        if (! $user->hasAnyRole([Roles::PARTNER_KNOWLEDGE_MANAGER, Roles::PARTNER_CONTENT_CONTRIBUTOR])) {
            return false;
        }

        if ($user->hasRole(Roles::PARTNER_ADMIN)) {
            return false;
        }

        return User::where('partner_id', $user->partner_id)
            ->whereKeyNot($user->id)
            ->whereHas('roles', fn ($q) => $q->where('name', Roles::PARTNER_ADMIN))
            ->exists();
    }

    /**
     * True when the caller asked for — and is permitted to see — unpublished
     * records. Only content managers get full draft visibility; contributors
     * never see other authors' drafts this way.
     */
    protected function wantsAdmin(Request $request): bool
    {
        // Public read routes carry no auth middleware, so resolve the bearer
        // token explicitly through the sanctum guard.
        $user = $request->user() ?? $request->user('sanctum');

        return $request->boolean('admin')
            && $user !== null
            && $user->hasAnyRole(Roles::CONTENT_MANAGERS);
    }

    /** Generate a slug unique across the model's table. */
    protected function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slug = Str::slug($base) ?: Str::random(8);
        $candidate = $slug;
        $i = 1;
        while ($this->modelClass::where('slug', $candidate)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $candidate = "{$slug}-{$i}";
            $i++;
        }
        return $candidate;
    }

    /** Resolve slug arrays to internal ids for a related model. */
    protected function idsForSlugs(string $modelClass, array $slugs): array
    {
        return $modelClass::whereIn('slug', array_filter($slugs))->pluck('id')->all();
    }
}
