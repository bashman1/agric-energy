<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
     * Workflow state forced onto a record on create/update. Content managers
     * publish directly, so this is a no-op for them. Everyone else (i.e. a
     * content-contributor) has their content held as `pending` and unpublished
     * — applied on update too, so a contributor can never self-publish by
     * flipping `published` in an edit payload.
     */
    protected function enforceWorkflow(Request $request): array
    {
        $user = $request->user();

        if ($user && ! $user->hasAnyRole(Roles::CONTENT_MANAGERS)) {
            return [
                'workflow_status' => $this->modelClass::STATUS_PENDING,
                'published' => false,
            ];
        }

        return [];
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
