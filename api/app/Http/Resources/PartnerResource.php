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
            'category' => $this->category ?? '',
            'acronym' => $this->acronym ?? '',
            'registrationNumber' => $this->registration_number ?? '',
            'taxId' => $this->tax_id ?? '',
            'yearEstablished' => $this->year_established ?? '',
            'physicalAddress' => $this->physical_address ?? '',
            'postalAddress' => $this->postal_address ?? '',
            'mission' => $this->mission ?? '',
            'employeesBand' => $this->employees_band ?? '',
            'branchesBand' => $this->branches_band ?? '',
            'beneficiariesBand' => $this->beneficiaries_band ?? '',
            'annualBudgetRange' => $this->annual_budget_range ?? '',
            'contactName' => $this->contact_name ?? '',
            'contactPosition' => $this->contact_position ?? '',
            'contactEmail' => $this->contact_email ?? '',
            'contactPhone' => $this->contact_phone ?? '',
            'regions' => $this->regions ?? [],
            'districtCoverage' => $this->district_coverage ?? [],
            'coverageScope' => $this->coverage_scope ?? [],
            'countries' => $this->countries ?? [],
            'sectors' => $this->sectors ?? [],
            'valueChains' => $this->value_chains ?? [],
            'expertise' => $this->expertise ?? [],
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
