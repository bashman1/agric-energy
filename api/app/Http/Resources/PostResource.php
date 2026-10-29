<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->category ?? 'news',
            'excerpt' => $this->excerpt ?? '',
            'body' => $this->body ?? '',
            'featuredImage' => $this->featured_image ?? '',
            'gallery' => $this->gallery ?? [],
            'publishedAt' => optional($this->published_at)->toISOString(),
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            // Staff reads only — loaded by ContentController::wantsAdmin().
            'createdBy' => $this->whenLoaded('author', fn () => $this->author?->name),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
