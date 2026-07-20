<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->category ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'documentUrl' => $this->document_url ?? '',
            'publicationDate' => $this->publication_date ?? '',
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
