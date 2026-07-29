<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ThemeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'name' => $this->name,
            'icon' => $this->icon ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'featuredImage' => $this->featured_image ?? '',
            'whyItMatters' => $this->why_it_matters ?? '',
            'relatedTechnologyIds' => $this->whenLoaded('technologies', fn () => $this->technologies->pluck('slug')->all(), []),
            'relatedProjectIds' => $this->whenLoaded('projects', fn () => $this->projects->pluck('slug')->all(), []),
            'relatedResourceIds' => $this->whenLoaded('resources', fn () => $this->resources->pluck('slug')->all(), []),
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
