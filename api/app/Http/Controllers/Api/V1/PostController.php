<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;

/** News & announcements. */
class PostController extends ContentController
{
    protected string $modelClass = Post::class;
    protected string $resourceClass = PostResource::class;
    protected array $searchable = ['title', 'excerpt', 'body'];
    protected array $filters = [
        'featured' => 'featured',
        'category' => 'category',
    ];
    protected string $orderBy = 'published_at';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'publishedAt' => 'nullable|date',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'excerpt' => 'excerpt',
            'body' => 'body',
            'category' => 'category',
            'featuredImage' => 'featured_image',
            'gallery' => 'gallery',
            'publishedAt' => 'published_at',
            'featured' => 'featured',
            'published' => 'published',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        return $attrs;
    }
}
