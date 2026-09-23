<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->slug,
            'slug' => $this->slug,
            'title' => $this->title,
            'opportunityType' => $this->opportunity_type ?? 'funding',
            'funder' => $this->funder ?? '',
            'summary' => $this->summary ?? '',
            'description' => $this->description ?? '',
            'amount' => $this->amount ?? '',
            'currency' => $this->currency ?? '',
            'sector' => $this->sector ?? '',
            'valueChain' => $this->value_chain ?? '',
            'region' => $this->region ?? '',
            'deadline' => optional($this->deadline)->toDateString(),
            'eligibility' => $this->eligibility ?? '',
            'externalUrl' => $this->external_url ?? '',
            'documentUrl' => $this->document_url ?? '',
            // Job/vacancy fields. Empty strings on every other type, so the
            // public page can test them without a type check.
            'organization' => $this->organization ?? '',
            'dutiesResponsibilities' => $this->duties_responsibilities ?? '',
            'minimumEducation' => $this->minimum_education ?? '',
            'experience' => $this->experience ?? '',
            'competences' => $this->competences ?? '',
            'featured' => (bool) $this->featured,
            'published' => (bool) $this->published,
            'workflowStatus' => $this->workflow_status,
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
