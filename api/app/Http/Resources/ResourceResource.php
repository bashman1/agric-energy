<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResourceResource extends JsonResource
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
            'featuredImage' => $this->featured_image ?? '',
            'fileUrl' => $this->file_url ?? '',
            'externalUrl' => $this->external_url ?? '',
            'themeIds' => $this->whenLoaded('themes', fn () => $this->themes->pluck('slug')->all(), []),
            'technologyIds' => $this->whenLoaded('technologies', fn () => $this->technologies->pluck('slug')->all(), []),
            'publicationDate' => $this->publication_date ?? '',
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'fileDownloadable' => $this->file_downloadable !== false,
            'fileName' => $this->file_name ?? '',
            // A restricted file has no usable direct URL: the page fetches a
            // short-lived signed one from here instead. Telling the client
            // which case it is in saves it guessing from the URL shape.
            'fileRestricted' => $this->file_downloadable === false && filled($this->file_path),
            'workflowStatus' => $this->workflow_status,
            // Staff reads only — loaded by ContentController::wantsAdmin().
            'createdBy' => $this->whenLoaded('author', fn () => $this->author?->name),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
