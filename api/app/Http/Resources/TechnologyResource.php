<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TechnologyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'name' => $this->name,
            'category' => $this->category ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'featuredImage' => $this->featured_image ?? '',
            'applications' => $this->applications ?? [],
            'benefits' => $this->benefits ?? [],
            'limitations' => $this->limitations ?? [],
            'operationalNotes' => $this->operational_notes ?? [],
            'maintenanceNotes' => $this->maintenance_notes ?? [],
            'relatedProjectIds' => $this->whenLoaded('projects', fn () => $this->projects->pluck('slug')->all(), []),
            'relatedResourceIds' => $this->whenLoaded('resources', fn () => $this->resources->pluck('slug')->all(), []),
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
