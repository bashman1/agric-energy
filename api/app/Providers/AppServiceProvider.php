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

        // Taxonomy management (categories, tags, metadata): content managers.
        Gate::define('manage', fn (User $user) => $user->hasAnyRole(Roles::CONTENT_MANAGERS));

        // Review queue + analytics dashboards: content managers.
        Gate::define('viewAny', fn (User $user) => $user->hasAnyRole(Roles::CONTENT_MANAGERS));

        // Uploads: any approved author. Mirrors ContentPolicy::create — the
        // admin bundle is publicly downloadable under the static build, so
        // `auth:sanctum` alone would let a pending or suspended account upload.
        Gate::define('upload-media', fn (User $user) => $user->isApproved()
            && $user->hasAnyRole(Roles::CONTENT_AUTHORS));

        // User & role management: platform admins (super-admins via before()).
        Gate::define('manage-users', fn (User $user) => $user->hasRole(Roles::PLATFORM_ADMIN));

        // Core system settings and the audit trail are super-admin-only: the
        // closures deny everyone, so only Gate::before() lets a super-admin
        // through. Keeps them off-limits even to platform administrators.
        Gate::define('manage-settings', fn (User $user) => false);
        Gate::define('view-audit', fn (User $user) => false);
    }
}
