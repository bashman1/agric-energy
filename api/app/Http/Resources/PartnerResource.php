<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartnerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'name' => $this->name,
            'type' => $this->type ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'website' => $this->website ?? '',
            'email' => $this->email ?? '',
            'phone' => $this->phone ?? '',
            'logo' => $this->logo ?? '',
            'regions' => $this->regions ?? [],
            'districtCoverage' => $this->district_coverage ?? [],
            'technologyIds' => $this->whenLoaded('technologies', fn () => $this->technologies->pluck('slug')->all(), []),
            'themeIds' => $this->whenLoaded('themes', fn () => $this->themes->pluck('slug')->all(), []),
            'projectIds' => $this->whenLoaded('projects', fn () => $this->projects->pluck('slug')->all(), []),
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
