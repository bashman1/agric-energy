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
use App\Models\Submission;
use App\Models\Subscriber;
use App\Models\Technology;
use App\Models\Theme;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Spatie\Activitylog\Models\Activity;

/**
 * Administrative reporting module (ToR §"Search, Analytics and Reporting").
 *
 * Each report is a self-describing document — period, summary figures and a
 * list of tabular sections — so the front end can preview it and render the
 * same structure to PDF or Excel without report-specific code.
 *
 * Date grouping is done in PHP rather than SQL so the reports behave
 * identically on PostgreSQL (production) and SQLite (test/CI).
 */
class ReportController extends Controller
{
    /** Publishable content entities covered by the content reports. */
    private const CONTENT = [
        'projects' => ['model' => Project::class, 'label' => 'Projects'],
        'technologies' => ['model' => Technology::class, 'label' => 'Technologies'],
        'themes' => ['model' => Theme::class, 'label' => 'Thematic areas'],
        'partners' => ['model' => Partner::class, 'label' => 'Partners'],
        'resources' => ['model' => Resource::class, 'label' => 'Knowledge resources'],
        'posts' => ['model' => Post::class, 'label' => 'News & stories'],
        'events' => ['model' => Event::class, 'label' => 'Events'],
        'opportunities' => ['model' => Opportunity::class, 'label' => 'Opportunities'],
        'policies' => ['model' => Policy::class, 'label' => 'Policies'],
    ];

    /** key => [title, description, method] */
    private const REPORTS = [
        'platform-overview' => [
            'title' => 'Platform Overview Report',
            'description' => 'Executive summary of content, users and engagement across the Agri-Energy Desk.',
            'method' => 'platformOverview',
        ],
        'content-inventory' => [
            'title' => 'Content Inventory Report',
            'description' => 'Full stocktake of every content type by publication and editorial workflow status.',
            'method' => 'contentInventory',
        ],
        'content-growth' => [
            'title' => 'Content Growth & Trends Report',
            'description' => 'Records added and updated per month over the reporting period, by content type.',
            'method' => 'contentGrowth',
        ],
        'content-utilisation' => [
            'title' => 'Content Utilisation Report',
            'description' => 'Editorial activity drawn from the audit trail: who contributed what, and how often.',
            'method' => 'contentUtilisation',
        ],
        'user-engagement' => [
            'title' => 'User Engagement Report',
            'description' => 'Registrations, roles, account status, partner contributions and newsletter reach.',
            'method' => 'userEngagement',
        ],
        'project-portfolio' => [
            'title' => 'Project Portfolio Report',
            'description' => 'Published project portfolio by region, status, value chain, funding and beneficiaries.',
            'method' => 'projectPortfolio',
        ],
        'stakeholder-directory' => [
            'title' => 'Stakeholder Directory Report',
            'description' => 'Registered partner organisations by type and geographic coverage.',
            'method' => 'stakeholderDirectory',
        ],
        'opportunities-events' => [
            'title' => 'Opportunities & Events Report',
            'description' => 'Funding, investment and procurement notices alongside the events calendar.',
            'method' => 'opportunitiesEvents',
        ],
    ];

    /** Catalogue of available reports, for the admin reports index. */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny');

        return response()->json([
            'data' => collect(self::REPORTS)
                ->map(fn (array $meta, string $key) => [
                    'key' => $key,
                    'title' => $meta['title'],
                    'description' => $meta['description'],
                ])
                ->values(),
        ]);
    }

    /** Build a single report for the requested period. */
    public function show(Request $request, string $report): JsonResponse
    {
        $this->authorize('viewAny');

        abort_unless(isset(self::REPORTS[$report]), 404, 'Unknown report');

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        // Default window: the last 12 complete months plus the current one.
        $to = isset($validated['to'])
            ? CarbonImmutable::parse($validated['to'])->endOfDay()
            : CarbonImmutable::now()->endOfDay();
        $from = isset($validated['from'])
            ? CarbonImmutable::parse($validated['from'])->startOfDay()
            : $to->subMonths(11)->startOfMonth();

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->startOfDay(), $from->endOfDay()];
        }

        $meta = self::REPORTS[$report];
        $built = $this->{$meta['method']}($from, $to);

        return response()->json([
            'data' => [
                'key' => $report,
                'title' => $meta['title'],
                'description' => $meta['description'],
                'period' => [
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                    'label' => $from->format('j M Y') . ' – ' . $to->format('j M Y'),
                ],
                'generatedAt' => CarbonImmutable::now()->toISOString(),
                'summary' => $built['summary'],
                'sections' => $built['sections'],
            ],
        ]);
    }

    // ─── Reports ────────────────────────────────────────────────

    private function platformOverview(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $totals = ['total' => 0, 'published' => 0, 'pending' => 0];
        $rows = [];

        foreach (self::CONTENT as $meta) {
            $model = $meta['model'];
            $total = $model::count();
            $published = $model::where('published', true)->count();
            $pending = $model::whereIn('workflow_status', ['pending', 'in_review'])->count();
            $added = $this->withinPeriod($model::query(), 'created_at', $from, $to)->count();

            $totals['total'] += $total;
            $totals['published'] += $published;
            $totals['pending'] += $pending;

            $rows[] = [$meta['label'], $total, $published, $pending, $added];
        }

        $activity = $this->withinPeriod(Activity::query(), 'created_at', $from, $to)->count();

        return [
            'summary' => [
                ['label' => 'Content items', 'value' => $totals['total']],
                ['label' => 'Published', 'value' => $totals['published']],
                ['label' => 'Awaiting review', 'value' => $totals['pending']],
                ['label' => 'Registered users', 'value' => User::count()],
                ['label' => 'Editorial actions in period', 'value' => $activity],
                ['label' => 'Enquiries received', 'value' => $this->withinPeriod(Submission::query(), 'created_at', $from, $to)->count()],
            ],
            'sections' => [
                [
                    'heading' => 'Content by type',
                    'kind' => 'table',
                    'columns' => ['Content type', 'Total', 'Published', 'Awaiting review', 'Added in period'],
                    'rows' => $rows,
                ],
                [
                    'heading' => 'Published projects by region',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Region', 'Projects'],
                    'rows' => $this->countBy(Project::where('published', true), 'region'),
                ],
                [
                    'heading' => 'User accounts by status',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Status', 'Users'],
                    'rows' => $this->countBy(User::query(), 'status'),
                ],
            ],
        ];
    }

    private function contentInventory(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $statuses = ['draft', 'pending', 'in_review', 'approved', 'published', 'rejected', 'archived'];
        $rows = [];
        $featured = 0;

        foreach (self::CONTENT as $meta) {
            $model = $meta['model'];
            $counts = $model::query()
                ->selectRaw('workflow_status, count(*) as c')
                ->groupBy('workflow_status')
                ->pluck('c', 'workflow_status');

            $row = [$meta['label']];
            foreach ($statuses as $status) {
                $row[] = (int) ($counts[$status] ?? 0);
            }
            $row[] = $model::count();
            $rows[] = $row;

            $featured += $model::where('featured', true)->count();
        }

        // Stale records: published but untouched for more than a year.
        $staleCutoff = CarbonImmutable::now()->subYear();
        $stale = [];
        foreach (self::CONTENT as $key => $meta) {
            $model = $meta['model'];
            foreach ($model::where('published', true)->where('updated_at', '<', $staleCutoff)->orderBy('updated_at')->limit(15)->get() as $record) {
                $stale[] = [
                    $meta['label'],
                    $this->titleOf($record),
                    optional($record->updated_at)->format('j M Y'),
                ];
            }
        }

        return [
            'summary' => [
                ['label' => 'Content types', 'value' => count(self::CONTENT)],
                ['label' => 'Total records', 'value' => array_sum(array_map(fn ($r) => end($r), $rows))],
                ['label' => 'Featured records', 'value' => $featured],
                ['label' => 'Records not updated in 12 months', 'value' => count($stale)],
            ],
            'sections' => [
                [
                    'heading' => 'Records by editorial workflow status',
                    'kind' => 'table',
                    'columns' => array_merge(
                        ['Content type'],
                        array_map(fn ($s) => ucfirst(str_replace('_', ' ', $s)), $statuses),
                        ['Total']
                    ),
                    'rows' => $rows,
                ],
                [
                    'heading' => 'Published records needing review (no update in 12 months)',
                    'kind' => 'table',
                    'columns' => ['Content type', 'Record', 'Last updated'],
                    'rows' => $stale,
                    'note' => $stale === []
                        ? 'All published records have been updated within the last 12 months.'
                        : 'Listed oldest first, capped at 15 records per content type.',
                ],
            ],
        ];
    }

    private function contentGrowth(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $months = $this->monthBuckets($from, $to);
        $created = [];
        $updated = [];
        $totalCreated = 0;

        foreach (self::CONTENT as $key => $meta) {
            $model = $meta['model'];

            $createdByMonth = $this->groupByMonth(
                $this->withinPeriod($model::query(), 'created_at', $from, $to)->pluck('created_at')
            );
            $updatedByMonth = $this->groupByMonth(
                $this->withinPeriod($model::query(), 'updated_at', $from, $to)->pluck('updated_at')
            );

            $created[$meta['label']] = $createdByMonth;
            $updated[$meta['label']] = $updatedByMonth;
            $totalCreated += array_sum($createdByMonth);
        }

        $monthlyTotals = [];
        foreach ($months as $month) {
            $monthlyTotals[] = [
                CarbonImmutable::parse($month . '-01')->format('M Y'),
                array_sum(array_map(fn ($series) => $series[$month] ?? 0, $created)),
                array_sum(array_map(fn ($series) => $series[$month] ?? 0, $updated)),
            ];
        }

        $matrix = [];
        foreach ($created as $label => $series) {
            $row = [$label];
            foreach ($months as $month) {
                $row[] = $series[$month] ?? 0;
            }
            $row[] = array_sum($series);
            $matrix[] = $row;
        }

        $activeMonths = max(1, count(array_filter($monthlyTotals, fn ($r) => $r[1] > 0)));

        return [
            'summary' => [
                ['label' => 'Records added in period', 'value' => $totalCreated],
                ['label' => 'Months covered', 'value' => count($months)],
                ['label' => 'Average per active month', 'value' => round($totalCreated / $activeMonths, 1)],
            ],
            'sections' => [
                [
                    'heading' => 'Monthly activity',
                    'kind' => 'table',
                    'columns' => ['Month', 'Records added', 'Records updated'],
                    'rows' => $monthlyTotals,
                ],
                [
                    'heading' => 'Records added per content type',
                    'kind' => 'table',
                    'columns' => array_merge(
                        ['Content type'],
                        array_map(fn ($m) => CarbonImmutable::parse($m . '-01')->format('M y'), $months),
                        ['Total']
                    ),
                    'rows' => $matrix,
                    'note' => 'Counts records by creation date within the reporting period.',
                ],
            ],
        ];
    }

    private function contentUtilisation(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $activities = $this->withinPeriod(Activity::query(), 'created_at', $from, $to)
            ->with('causer')
            ->get();

        $byEvent = $activities->groupBy(fn (Activity $a) => $a->event ?? 'other')
            ->map->count()->sortDesc();

        $bySubject = $activities->groupBy(fn (Activity $a) => class_basename($a->subject_type ?? 'Unknown'))
            ->map->count()->sortDesc();

        $byUser = $activities->groupBy(fn (Activity $a) => $a->causer?->name ?? 'System')
            ->map->count()->sortDesc();

        $byMonth = $this->groupByMonth($activities->pluck('created_at'));

        // Records touched most often — a proxy for editorial attention.
        $hotRecords = $activities
            ->filter(fn (Activity $a) => $a->subject_type && $a->subject_id)
            ->groupBy(fn (Activity $a) => class_basename($a->subject_type) . '#' . $a->subject_id)
            ->map(fn (Collection $group) => [
                'label' => class_basename($group->first()->subject_type),
                'name' => $group->first()->description,
                'count' => $group->count(),
                'last' => $group->max('created_at'),
            ])
            ->sortByDesc('count')
            ->take(20);

        return [
            'summary' => [
                ['label' => 'Editorial actions', 'value' => $activities->count()],
                ['label' => 'Contributors active', 'value' => $byUser->count()],
                ['label' => 'Records touched', 'value' => $hotRecords->count()],
            ],
            'sections' => [
                [
                    'heading' => 'Actions by type',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Action', 'Count'],
                    'rows' => $byEvent->map(fn ($count, $event) => [ucfirst((string) $event), $count])->values()->all(),
                ],
                [
                    'heading' => 'Actions by content type',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Content type', 'Actions'],
                    'rows' => $bySubject->map(fn ($count, $subject) => [$subject, $count])->values()->all(),
                ],
                [
                    'heading' => 'Actions by contributor',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Contributor', 'Actions'],
                    'rows' => $byUser->map(fn ($count, $user) => [$user, $count])->values()->all(),
                ],
                [
                    'heading' => 'Editorial actions per month',
                    'kind' => 'table',
                    'columns' => ['Month', 'Actions'],
                    'rows' => $this->monthRows($byMonth, $from, $to),
                ],
                [
                    'heading' => 'Most actively edited records',
                    'kind' => 'table',
                    'columns' => ['Content type', 'Record', 'Actions', 'Last action'],
                    'rows' => $hotRecords->map(fn (array $r) => [
                        $r['label'],
                        $r['name'],
                        $r['count'],
                        CarbonImmutable::parse($r['last'])->format('j M Y'),
                    ])->values()->all(),
                    'note' => 'Top 20 records by number of audited changes in the period.',
                ],
            ],
        ];
    }

    private function userEngagement(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $registered = $this->withinPeriod(User::query(), 'created_at', $from, $to)->count();

        $byRole = User::with('roles')->get()
            ->flatMap(fn (User $u) => $u->roles->pluck('name')->all() ?: ['(no role)'])
            ->countBy()
            ->sortDesc();

        $submissions = $this->withinPeriod(Submission::query(), 'created_at', $from, $to)->get();
        $subscribers = $this->withinPeriod(Subscriber::query(), 'created_at', $from, $to)->count();

        // Partner-authored content across every publishable type.
        $partnerAuthored = [];
        foreach (self::CONTENT as $meta) {
            $model = $meta['model'];
            $count = $this->withinPeriod($model::whereNotNull('created_by'), 'created_at', $from, $to)->count();
            if ($count > 0) {
                $partnerAuthored[] = [$meta['label'], $count];
            }
        }

        return [
            'summary' => [
                ['label' => 'Registered users', 'value' => User::count()],
                ['label' => 'New registrations in period', 'value' => $registered],
                ['label' => 'Awaiting approval', 'value' => User::where('status', User::STATUS_PENDING)->count()],
                ['label' => 'Enquiries in period', 'value' => $submissions->count()],
                ['label' => 'Newsletter sign-ups in period', 'value' => $subscribers],
            ],
            'sections' => [
                [
                    'heading' => 'Registrations per month',
                    'kind' => 'table',
                    'columns' => ['Month', 'New users'],
                    'rows' => $this->monthRows(
                        $this->groupByMonth($this->withinPeriod(User::query(), 'created_at', $from, $to)->pluck('created_at')),
                        $from,
                        $to
                    ),
                ],
                [
                    'heading' => 'Users by role',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Role', 'Users'],
                    'rows' => $byRole->map(fn ($count, $role) => [ucfirst((string) $role), $count])->values()->all(),
                ],
                [
                    'heading' => 'Users by account status',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Status', 'Users'],
                    'rows' => $this->countBy(User::query(), 'status'),
                ],
                [
                    'heading' => 'Contributed content in period',
                    'kind' => 'table',
                    'columns' => ['Content type', 'Records contributed'],
                    'rows' => $partnerAuthored,
                    'note' => 'Records created by a signed-in contributor (partner portal or admin).',
                ],
                [
                    'heading' => 'Enquiries by status',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Status', 'Enquiries'],
                    'rows' => $submissions->groupBy('status')->map->count()
                        ->map(fn ($count, $status) => [ucfirst((string) $status), $count])->values()->all(),
                ],
            ],
        ];
    }

    private function projectPortfolio(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $projects = Project::where('published', true)->get();

        $budget = $projects->whereNotNull('budget');
        $byCurrency = $budget->groupBy(fn (Project $p) => $p->budget_currency ?: 'Unspecified')
            ->map(fn (Collection $g) => $g->sum('budget'));

        return [
            'summary' => [
                ['label' => 'Published projects', 'value' => $projects->count()],
                ['label' => 'Districts covered', 'value' => $projects->pluck('district')->filter()->unique()->count()],
                ['label' => 'Beneficiaries reached', 'value' => (int) $projects->sum('beneficiary_count')],
                ['label' => 'Projects with budget data', 'value' => $budget->count()],
                ['label' => 'Added in period', 'value' => $this->withinPeriod(Project::where('published', true), 'created_at', $from, $to)->count()],
            ],
            'sections' => [
                [
                    'heading' => 'Projects by region',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Region', 'Projects'],
                    'rows' => $this->countBy(Project::where('published', true), 'region'),
                ],
                [
                    'heading' => 'Projects by implementation status',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Status', 'Projects'],
                    'rows' => $this->countBy(Project::where('published', true), 'status'),
                ],
                [
                    'heading' => 'Projects by value chain',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Value chain', 'Projects'],
                    'rows' => $this->countBy(Project::where('published', true), 'value_chain'),
                ],
                [
                    'heading' => 'Committed budget by currency',
                    'kind' => 'table',
                    'columns' => ['Currency', 'Projects', 'Total budget'],
                    'rows' => $byCurrency->map(fn ($sum, $currency) => [
                        $currency,
                        $budget->where('budget_currency', $currency === 'Unspecified' ? null : $currency)->count(),
                        number_format((float) $sum),
                    ])->values()->all(),
                    'note' => 'Budget figures are self-reported by implementing partners.',
                ],
                [
                    'heading' => 'Leading funding partners',
                    'kind' => 'table',
                    'columns' => ['Funding partner', 'Projects'],
                    'rows' => $projects->groupBy(fn (Project $p) => $p->funding_partner ?: 'Not stated')
                        ->map->count()->sortDesc()->take(15)
                        ->map(fn ($count, $funder) => [$funder, $count])->values()->all(),
                ],
                [
                    'heading' => 'Project register',
                    'kind' => 'table',
                    'columns' => ['Project', 'Region', 'District', 'Status', 'Beneficiaries'],
                    'rows' => $projects->sortBy('title')->map(fn (Project $p) => [
                        $p->title,
                        $p->region ?: '—',
                        $p->district ?: '—',
                        $p->status ?: '—',
                        $p->beneficiary_count !== null ? number_format($p->beneficiary_count) : '—',
                    ])->values()->all(),
                ],
            ],
        ];
    }

    private function stakeholderDirectory(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $partners = Partner::where('published', true)->get();

        $byRegion = $partners->flatMap(fn (Partner $p) => (array) ($p->regions ?: []))
            ->countBy()->sortDesc();

        return [
            'summary' => [
                ['label' => 'Published partners', 'value' => $partners->count()],
                ['label' => 'Organisation types', 'value' => $partners->pluck('type')->filter()->unique()->count()],
                ['label' => 'With contact email', 'value' => $partners->filter(fn (Partner $p) => (bool) $p->email)->count()],
                ['label' => 'Registered in period', 'value' => $this->withinPeriod(Partner::query(), 'created_at', $from, $to)->count()],
            ],
            'sections' => [
                [
                    'heading' => 'Partners by organisation type',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Type', 'Organisations'],
                    'rows' => $this->countBy(Partner::where('published', true), 'type'),
                ],
                [
                    'heading' => 'Partners by region of operation',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Region', 'Organisations'],
                    'rows' => $byRegion->map(fn ($count, $region) => [$region, $count])->values()->all(),
                ],
                [
                    'heading' => 'Directory',
                    'kind' => 'table',
                    'columns' => ['Organisation', 'Type', 'Email', 'Website'],
                    'rows' => $partners->sortBy('name')->map(fn (Partner $p) => [
                        $p->name,
                        $p->type ?: '—',
                        $p->email ?: '—',
                        $p->website ?: '—',
                    ])->values()->all(),
                ],
            ],
        ];
    }

    private function opportunitiesEvents(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $opportunities = Opportunity::where('published', true)->get();
        $now = CarbonImmutable::now();

        $open = $opportunities->filter(fn (Opportunity $o) => ! $o->deadline || CarbonImmutable::parse($o->deadline)->greaterThanOrEqualTo($now));

        $events = Event::where('published', true)->get();
        $upcoming = $events->filter(fn (Event $e) => $e->starts_at && CarbonImmutable::parse($e->starts_at)->greaterThanOrEqualTo($now));

        $inPeriod = $events->filter(function (Event $e) use ($from, $to) {
            return $e->starts_at
                && CarbonImmutable::parse($e->starts_at)->betweenIncluded($from, $to);
        });

        return [
            'summary' => [
                ['label' => 'Published opportunities', 'value' => $opportunities->count()],
                ['label' => 'Currently open', 'value' => $open->count()],
                ['label' => 'Published events', 'value' => $events->count()],
                ['label' => 'Upcoming events', 'value' => $upcoming->count()],
                ['label' => 'Events held in period', 'value' => $inPeriod->count()],
            ],
            'sections' => [
                [
                    'heading' => 'Opportunities by type',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Type', 'Notices'],
                    'rows' => $this->countBy(Opportunity::where('published', true), 'opportunity_type'),
                ],
                [
                    'heading' => 'Open opportunities',
                    'kind' => 'table',
                    'columns' => ['Title', 'Type', 'Funder', 'Amount', 'Deadline'],
                    'rows' => $open->sortBy('deadline')->map(fn (Opportunity $o) => [
                        $o->title,
                        $o->opportunity_type ?: '—',
                        $o->funder ?: '—',
                        trim(($o->currency ?: '') . ' ' . ($o->amount ?: '')) ?: '—',
                        $o->deadline ? CarbonImmutable::parse($o->deadline)->format('j M Y') : 'Rolling',
                    ])->values()->all(),
                ],
                [
                    'heading' => 'Events by type',
                    'kind' => 'table',
                    'chart' => true,
                    'columns' => ['Type', 'Events'],
                    'rows' => $this->countBy(Event::where('published', true), 'type'),
                ],
                [
                    'heading' => 'Events in reporting period',
                    'kind' => 'table',
                    'columns' => ['Event', 'Type', 'Starts', 'Location'],
                    'rows' => $inPeriod->sortBy('starts_at')->map(fn (Event $e) => [
                        $e->title,
                        $e->type ?: '—',
                        $e->starts_at ? CarbonImmutable::parse($e->starts_at)->format('j M Y') : '—',
                        $e->is_online ? 'Online' : ($e->location ?: '—'),
                    ])->values()->all(),
                ],
            ],
        ];
    }

    // ─── Helpers ────────────────────────────────────────────────

    /** Restrict a query to the reporting window on the given timestamp column. */
    private function withinPeriod(Builder $query, string $column, CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return $query->whereBetween($column, [$from, $to]);
    }

    /** [[value, count], …] for a column, blanks folded into "Not stated". */
    private function countBy(Builder $query, string $column): array
    {
        return $query->get()
            ->groupBy(fn ($row) => $row->{$column} ?: 'Not stated')
            ->map->count()
            ->sortDesc()
            ->map(fn ($count, $value) => [(string) $value, $count])
            ->values()
            ->all();
    }

    /** ["2026-07" => 3, …] from a collection of timestamps. */
    private function groupByMonth(Collection $timestamps): array
    {
        return $timestamps
            ->filter()
            ->groupBy(fn ($ts) => CarbonImmutable::parse($ts)->format('Y-m'))
            ->map->count()
            ->all();
    }

    /** Every month in the window, so gaps show as zero rather than vanishing. */
    private function monthBuckets(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $months = [];
        $cursor = $from->startOfMonth();
        while ($cursor->lessThanOrEqualTo($to)) {
            $months[] = $cursor->format('Y-m');
            $cursor = $cursor->addMonth();
        }
        return $months;
    }

    /** Month-labelled rows for a ["Y-m" => count] series. */
    private function monthRows(array $series, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return array_map(fn (string $month) => [
            CarbonImmutable::parse($month . '-01')->format('M Y'),
            $series[$month] ?? 0,
        ], $this->monthBuckets($from, $to));
    }

    /** Best available human label for a content record. */
    private function titleOf(object $record): string
    {
        return $record->title ?? $record->name ?? $record->slug ?? ('#' . $record->id);
    }
}
