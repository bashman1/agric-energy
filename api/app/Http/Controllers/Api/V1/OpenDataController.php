<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Public open-data endpoints: aggregated regional statistics for the map, and
 * downloadable project datasets (CSV / GeoJSON). Published records only.
 */
class OpenDataController extends Controller
{
    /** Per-region aggregates for map choropleth + overlays. */
    public function regions(): JsonResponse
    {
        $rows = Project::query()
            ->where('published', true)
            ->whereNotNull('region')
            ->where('region', '!=', '')
            ->groupBy('region')
            ->select(
                'region',
                DB::raw('count(*) as count'),
                DB::raw('coalesce(sum(budget),0) as total_budget'),
                DB::raw('coalesce(sum(beneficiary_count),0) as beneficiaries')
            )
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'region' => $r->region,
                'count' => (int) $r->count,
                'totalBudget' => (float) $r->total_budget,
                'beneficiaries' => (int) $r->beneficiaries,
            ]),
        ]);
    }

    /** Published projects as CSV. */
    public function projectsCsv(): StreamedResponse
    {
        $projects = Project::where('published', true)->orderBy('title')->get();

        return response()->streamDownload(function () use ($projects) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Slug', 'Title', 'Region', 'District', 'Value Chain', 'Status',
                'Funding Partner', 'Budget', 'Currency', 'Beneficiaries',
                'Latitude', 'Longitude', 'Start', 'End',
            ]);
            foreach ($projects as $p) {
                fputcsv($out, [
                    $p->slug, $p->title, $p->region, $p->district, $p->value_chain,
                    $p->status, $p->funding_partner, $p->budget, $p->budget_currency,
                    $p->beneficiary_count, $p->lat, $p->lng, $p->start_date, $p->end_date,
                ]);
            }
            fclose($out);
        }, 'agri-energy-projects.csv', ['Content-Type' => 'text/csv']);
    }

    /** Published, geolocated projects as GeoJSON FeatureCollection. */
    public function projectsGeojson(): JsonResponse
    {
        $projects = Project::where('published', true)
            ->whereNotNull('lat')->whereNotNull('lng')->get();

        $features = $projects->map(fn (Project $p) => [
            'type' => 'Feature',
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [(float) $p->lng, (float) $p->lat],
            ],
            'properties' => [
                'slug' => $p->slug,
                'title' => $p->title,
                'region' => $p->region,
                'district' => $p->district,
                'valueChain' => $p->value_chain,
                'status' => $p->status,
                'budget' => $p->budget,
                'currency' => $p->budget_currency,
                'beneficiaries' => $p->beneficiary_count,
            ],
        ]);

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ], 200, ['Content-Disposition' => 'attachment; filename="agri-energy-projects.geojson"']);
    }
}
