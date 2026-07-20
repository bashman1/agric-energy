<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Project;
use App\Models\Resource;
use App\Models\Submission;
use App\Models\Technology;
use App\Models\Theme;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Administrative analytics & reporting: platform metrics for the admin
 * dashboard plus downloadable CSV report exports. Staff-only.
 */
class AnalyticsController extends Controller
{
    private const CONTENT = [
        'projects' => Project::class,
        'technologies' => Technology::class,
        'themes' => Theme::class,
        'partners' => Partner::class,
        'resources' => Resource::class,
        'events' => Event::class,
        'opportunities' => Opportunity::class,
    ];

    public function overview(Request $request): JsonResponse
    {
        $this->authorize('viewAny'); // editors + reviewers

        // Content totals + published/pending breakdown.
        $content = [];
        $workflow = ['draft' => 0, 'pending' => 0, 'in_review' => 0, 'published' => 0, 'rejected' => 0, 'archived' => 0];
        foreach (self::CONTENT as $type => $model) {
            $content[$type] = [
                'total' => $model::count(),
                'published' => $model::where('published', true)->count(),
            ];
            foreach ($model::query()
                ->select('workflow_status', DB::raw('count(*) as c'))
                ->groupBy('workflow_status')->pluck('c', 'workflow_status') as $status => $c) {
                $workflow[$status] = ($workflow[$status] ?? 0) + $c;
            }
        }

        $projectsByRegion = Project::query()
            ->select('region', DB::raw('count(*) as c'))
            ->where('published', true)->whereNotNull('region')->where('region', '!=', '')
            ->groupBy('region')->orderByDesc('c')->pluck('c', 'region');

        $projectsByStatus = Project::query()
            ->select('status', DB::raw('count(*) as c'))
            ->where('published', true)->whereNotNull('status')
            ->groupBy('status')->orderByDesc('c')->pluck('c', 'status');

        $submissions = Submission::query()
            ->select('status', DB::raw('count(*) as c'))
            ->groupBy('status')->pluck('c', 'status');

        // Content contributed per theme (top 8).
        $byTheme = Theme::query()
            ->withCount('projects')
            ->orderByDesc('projects_count')
            ->limit(8)->get(['name'])
            ->mapWithKeys(fn ($t) => [$t->name => $t->projects_count]);

        $users = [
            'total' => User::count(),
            'pending' => User::where('status', User::STATUS_PENDING)->count(),
            'partners' => User::role('partner')->count(),
        ];

        return response()->json([
            'data' => [
                'content' => $content,
                'workflow' => $workflow,
                'projectsByRegion' => $projectsByRegion,
                'projectsByStatus' => $projectsByStatus,
                'submissions' => $submissions,
                'contentByTheme' => $byTheme,
                'users' => $users,
                'totals' => [
                    'contentItems' => array_sum(array_map(fn ($c) => $c['total'], $content)),
                    'published' => array_sum(array_map(fn ($c) => $c['published'], $content)),
                    'pendingReview' => ($workflow['pending'] ?? 0) + ($workflow['in_review'] ?? 0),
                    'submissions' => Submission::count(),
                ],
            ],
        ]);
    }

    /** Stream a CSV report for a given content dataset. */
    public function export(Request $request, string $type): StreamedResponse
    {
        $this->authorize('viewAny');

        abort_unless(isset(self::CONTENT[$type]), 404, 'Unknown dataset');
        $model = self::CONTENT[$type];

        $columns = $this->columnsFor($type);
        $rows = $model::query()->orderBy('id')->get();
        $filename = "agri-energy-{$type}-" . now()->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($rows, $columns) {
            $out = fopen('php://output', 'w');
            fputcsv($out, array_values($columns));
            foreach ($rows as $row) {
                fputcsv($out, array_map(function ($col) use ($row) {
                    $v = $row->{$col};
                    return is_array($v) ? implode('; ', $v) : $v;
                }, array_keys($columns)));
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** column => header label per dataset. */
    private function columnsFor(string $type): array
    {
        $base = ['slug' => 'Slug', 'published' => 'Published', 'workflow_status' => 'Status', 'updated_at' => 'Updated'];
        return match ($type) {
            'projects' => ['title' => 'Title', 'region' => 'Region', 'district' => 'District', 'value_chain' => 'Value Chain', 'status' => 'Project Status', 'funding_partner' => 'Funder'] + $base,
            'technologies' => ['name' => 'Name', 'category' => 'Category'] + $base,
            'themes' => ['name' => 'Name'] + $base,
            'partners' => ['name' => 'Name', 'type' => 'Type', 'email' => 'Email', 'website' => 'Website'] + $base,
            'resources' => ['title' => 'Title', 'type' => 'Type', 'publication_date' => 'Published On'] + $base,
            'events' => ['title' => 'Title', 'type' => 'Type', 'starts_at' => 'Starts', 'location' => 'Location'] + $base,
            'opportunities' => ['title' => 'Title', 'funder' => 'Funder', 'amount' => 'Amount', 'currency' => 'Currency', 'deadline' => 'Deadline'] + $base,
            default => ['title' => 'Title'] + $base,
        };
    }
}
