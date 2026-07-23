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
            return $user->hasRole('super-admin') ? true : null;
        });

        foreach (self::CONTENT_MODELS as $model) {
            Gate::policy($model, ContentPolicy::class);
        }

        // Site configuration & taxonomy management is an editor-level action.
        $editor = fn (User $user) => $user->hasRole('editor');
        Gate::define('manage', $editor); // used as authorize('manage', SiteConfig::class|TaxonomyItem::class)

        // Contact-form inbox: editors and reviewers may triage.
        Gate::define('viewAny', fn (User $user) => $user->hasAnyRole(['editor', 'reviewer']));

        // Uploads: any approved contributor. Mirrors ContentPolicy::create —
        // the admin bundle is publicly downloadable under the static build, so
        // `auth:sanctum` alone would let a pending or suspended account upload.
        Gate::define('upload-media', fn (User $user) => $user->isApproved()
            && $user->hasAnyRole(['editor', 'reviewer', 'partner']));

        // Account management is restricted to super-admins (granted via before()).
        Gate::define('manage-users', fn (User $user) => false);
    }
}
