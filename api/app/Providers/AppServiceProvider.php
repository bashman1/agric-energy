<?php

namespace App\Providers;

use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Partner;
use App\Models\Policy as PolicyModel;
use App\Models\Post;
use App\Models\Project;
use App\Models\Resource;
use App\Models\SiteConfig;
use App\Models\Submission;
use App\Models\TaxonomyItem;
use App\Models\Technology;
use App\Models\Theme;
use App\Models\User;
use App\Observers\ResourceObserver;
use App\Policies\ContentPolicy;
use App\Support\Roles;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /** Content models governed by the shared ContentPolicy. */
    private const CONTENT_MODELS = [
        Project::class, Technology::class, Theme::class, Partner::class,
        Resource::class, Event::class, Opportunity::class, PolicyModel::class,
        Post::class,
    ];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Super-admins bypass every ability check.
        Gate::before(function (User $user, string $ability) {
            return $user->hasRole(Roles::SUPER_ADMIN) ? true : null;
        });

        foreach (self::CONTENT_MODELS as $model) {
            Gate::policy($model, ContentPolicy::class);
        }

        // Moves a resource's file between the public and private disks when
        // its download setting changes — see ResourceObserver.
        Resource::observe(ResourceObserver::class);

        // Taxonomy management (categories, tags, metadata): content managers.
        Gate::define('manage', fn (User $user) => $user->hasAnyRole(Roles::CONTENT_MANAGERS));

        // Analytics dashboards and reports: content managers.
        Gate::define('viewAny', fn (User $user) => $user->hasAnyRole(Roles::CONTENT_MANAGERS));

        // The review queue itself is wider than `viewAny`: a reviewer works the
        // queue but has no business in the analytics dashboards, and holds none
        // of the authoring or taxonomy powers CONTENT_MANAGERS carries.
        Gate::define('review-queue', fn (User $user) => $user->hasAnyRole(Roles::REVIEWERS));

        // Uploads: any approved author. Mirrors ContentPolicy::create — the
        // admin bundle is publicly downloadable under the static build, so
        // `auth:sanctum` alone would let a pending or suspended account upload.
        Gate::define('upload-media', fn (User $user) => $user->isApproved()
            && $user->hasAnyRole(Roles::CONTENT_AUTHORS));

        // User & role management: platform admins (super-admins via before()).
        Gate::define('manage-users', fn (User $user) => $user->hasRole(Roles::PLATFORM_ADMIN));

        // An organisation's own team, in the partner portal. Deliberately a
        // SEPARATE gate from manage-users: that one is platform-wide, this
        // one only ever applies to accounts sharing the caller's partner_id
        // (enforced in PartnerTeamController, which is where the scoping
        // lives — this gate answers "may you manage a team at all").
        // Requires a partner_id, so an individual partner account with no
        // organisation behind it has no team to manage.
        Gate::define('manage-partner-team', fn (User $user) => $user->isApproved()
            && $user->hasRole(Roles::PARTNER_ADMIN)
            && $user->partner_id !== null);

        // An organisation signing off its own members' submissions, before
        // the platform queue ever sees them. Same holder as
        // `manage-partner-team` — the organisation's administrator — but a
        // separate gate because they answer different questions, and a
        // future deployment may well want one without the other.
        Gate::define('org-review-queue', fn (User $user) => $user->isApproved()
            && $user->hasRole(Roles::PARTNER_ADMIN)
            && $user->partner_id !== null);

        // Core system settings and the audit trail are super-admin-only: the
        // closures deny everyone, so only Gate::before() lets a super-admin
        // through. Keeps them off-limits even to platform administrators.
        Gate::define('manage-settings', fn (User $user) => false);
        Gate::define('view-audit', fn (User $user) => false);
    }
}
