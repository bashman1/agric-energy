<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialises a Project to the exact shape the Next.js frontend expects
 * (UI/lib/types/index.ts) — camelCase keys, slug as the external `id`, and
 * relationships flattened back to slug arrays. This keeps the Laravel API a
 * drop-in replacement for the prototype's internal /api routes.
 */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'region' => $this->region ?? '',
            'district' => $this->district ?? '',
            'regions' => $this->regions ?? [],
            'districts' => $this->districts ?? [],
            'locationNote' => $this->location_note ?? '',
            'coordinates' => [
                'lat' => (float) $this->lat,
                'lng' => (float) $this->lng,
            ],
            'implementingPartnerIds' => $this->whenLoaded('partners', fn () => $this->partners->pluck('slug')->all(), []),
            'fundingPartner' => $this->funding_partner ?? '',
            'budget' => $this->budget !== null ? (float) $this->budget : null,
            'budgetCurrency' => $this->budget_currency ?? '',
            'beneficiaryCount' => $this->beneficiary_count,
            'technologyIds' => $this->whenLoaded('technologies', fn () => $this->technologies->pluck('slug')->all(), []),
            'themeIds' => $this->whenLoaded('themes', fn () => $this->themes->pluck('slug')->all(), []),
            'valueChain' => $this->value_chain ?? '',
            'beneficiaries' => $this->beneficiaries ?? [],
            'status' => $this->status ?? '',
            'startDate' => $this->start_date ?? '',
            'endDate' => $this->end_date ?? '',
            'outcomes' => $this->outcomes ?? '',
            'featuredImage' => $this->featured_image ?? '',
            'gallery' => $this->gallery ?? [],
            'externalUrl' => $this->external_url ?? '',
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
