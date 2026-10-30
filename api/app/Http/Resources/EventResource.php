<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'title' => $this->title,
            'type' => $this->type ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'startsAt' => optional($this->starts_at)->toISOString(),
            'endsAt' => optional($this->ends_at)->toISOString(),
            'isOnline' => (bool) $this->is_online,
            'location' => $this->location ?? '',
            'registrationUrl' => $this->registration_url ?? '',
            'featuredImage' => $this->featured_image ?? '',
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            // Staff reads only — loaded by ContentController::wantsAdmin().
            'createdBy' => $this->whenLoaded('author', fn () => $this->author?->name),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
