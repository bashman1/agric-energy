<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Unified, ranked full-text search across all published content types, with
 * per-type facet counts. Uses PostgreSQL `ts_rank`/`plainto_tsquery` over a
 * weighted document (title/name > summary > description) for relevance.
 */
class SearchController extends Controller
{
    /**
     * type => [table, title column, summary column, description column,
     *          detail route prefix, badge column].
     */
    private const SOURCES = [
        'projects' => ['projects', 'title', 'summary', 'description', '/projects', 'status'],
        'technologies' => ['technologies', 'name', 'summary', 'description', '/technologies', 'category'],
        'themes' => ['themes', 'name', 'summary', 'description', '/themes', null],
        'partners' => ['partners', 'name', 'summary', 'description', '/partners', 'type'],
        'resources' => ['resources', 'title', 'summary', 'description', '/resources', 'type'],
        'events' => ['events', 'title', 'summary', 'description', '/events', 'type'],
        'opportunities' => ['opportunities', 'title', 'summary', 'description', '/opportunities', 'sector'],
    ];

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $typeFilter = $request->query('type'); // optional facet filter

        if (Str::length($q) < 2) {
            return response()->json([
                'data' => [],
                'facets' => [],
                'total' => 0,
                'query' => $q,
            ]);
        }

        $results = [];
        $facets = [];

        foreach (self::SOURCES as $type => [$table, $titleCol, $summaryCol, $descCol, $prefix, $badgeCol]) {
            if ($typeFilter && $typeFilter !== $type) {
                continue;
            }

            // Weighted tsvector: title (A) + summary (B) + description (C).
            $vector = "setweight(to_tsvector('english', coalesce({$titleCol},'')), 'A') || "
                . "setweight(to_tsvector('english', coalesce({$summaryCol},'')), 'B') || "
                . "setweight(to_tsvector('english', coalesce({$descCol},'')), 'C')";

            $rows = DB::table($table)
                ->selectRaw("slug, {$titleCol} as title, {$summaryCol} as summary, {$descCol} as description"
                    . ($badgeCol ? ", {$badgeCol} as badge" : ", null as badge")
                    . ", ts_rank(({$vector}), plainto_tsquery('english', ?)) as rank", [$q])
                ->where('published', true)
                ->whereRaw("({$vector}) @@ plainto_tsquery('english', ?)", [$q])
                ->orderByDesc('rank')
                ->limit(50)
                ->get();

            // Fallback: if full-text finds nothing, try a simple substring match
            // (handles partial words that tsquery misses, e.g. "sol").
            if ($rows->isEmpty()) {
                $rows = DB::table($table)
                    ->selectRaw("slug, {$titleCol} as title, {$summaryCol} as summary, {$descCol} as description"
                        . ($badgeCol ? ", {$badgeCol} as badge" : ", null as badge")
                        . ", 0 as rank")
                    ->where('published', true)
                    ->where(function (Builder $qb) use ($titleCol, $summaryCol, $q) {
                        $qb->where($titleCol, 'ilike', "%{$q}%")
                            ->orWhere($summaryCol, 'ilike', "%{$q}%");
                    })
                    ->limit(50)
                    ->get();
            }

            if ($rows->count() > 0) {
                $facets[$type] = $rows->count();
            }

            foreach ($rows as $r) {
                $results[] = [
                    'type' => $type,
                    'slug' => $r->slug,
                    'title' => $r->title,
                    'summary' => self::snippet($r->summary, $r->description),
                    'badge' => $r->badge,
                    'href' => "{$prefix}/{$r->slug}",
                    'rank' => (float) $r->rank,
                ];
            }
        }

        // Global relevance order across types.
        usort($results, fn ($a, $b) => $b['rank'] <=> $a['rank']);

        return response()->json([
            'data' => $results,
            'facets' => $facets,
            'total' => count($results),
            'query' => $q,
        ]);
    }

    /** Lightweight title-only typeahead suggestions for the search box. */
    public function suggest(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (Str::length($q) < 2) {
            return response()->json(['data' => []]);
        }

        $suggestions = [];
        foreach (self::SOURCES as $type => [$table, $titleCol, , , $prefix]) {
            $rows = DB::table($table)
                ->select('slug', "{$titleCol} as title")
                ->where('published', true)
                ->where($titleCol, 'ilike', "%{$q}%")
                ->limit(4)
                ->get();
            foreach ($rows as $r) {
                $suggestions[] = [
                    'title' => $r->title,
                    'type' => $type,
                    'href' => "{$prefix}/{$r->slug}",
                ];
            }
        }

        // Prefix matches first, then cap the list.
        $lower = Str::lower($q);
        usort($suggestions, fn ($a, $b) =>
            str_starts_with(Str::lower($b['title']), $lower) <=> str_starts_with(Str::lower($a['title']), $lower));

        return response()->json(['data' => array_slice($suggestions, 0, 8)]);
    }

    /**
     * The line shown under a search hit.
     *
     * Vacancies and tenders no longer carry a separate summary — their form
     * dropped it in favour of the rich Job Summary / Details field — so the
     * snippet falls back to that, with its HTML stripped. Without this a
     * tender would appear in results as a bare title.
     */
    private static function snippet(?string $summary, ?string $description): string
    {
        if (filled($summary)) {
            return $summary;
        }

        $text = html_entity_decode(strip_tags($description ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', str_replace("\xC2\xA0", ' ', $text)));

        return Str::limit($text, 160);
    }
}
