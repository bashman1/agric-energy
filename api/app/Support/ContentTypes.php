<?php

namespace App\Support;

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

/**
 * The canonical URL type slug => publishable model map.
 *
 * Both the editorial workflow and bulk actions address content by the same
 * slug the REST routes use ("projects", "technologies", …). That map used to
 * live privately inside WorkflowController; a second copy in a second
 * controller is how the two drift, and a type present in one but not the
 * other is a silent authorization hole rather than an error. One definition,
 * here, and both read from it.
 *
 * It is deliberately the same key set as the $readOnly array in routes/api.php
 * — anything registered there is publishable and must be listed here too.
 */
final class ContentTypes
{
    /** @var array<string, class-string<Model>> */
    public const MAP = [
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

    /** The model class for a type slug, or null when the slug is unknown. */
    public static function modelFor(string $type): ?string
    {
        return self::MAP[$type] ?? null;
    }

    /** The type slug for a model instance, e.g. a Project => "projects". */
    public static function slugFor(Model $model): ?string
    {
        foreach (self::MAP as $slug => $class) {
            if ($model instanceof $class) {
                return $slug;
            }
        }

        return null;
    }
}
