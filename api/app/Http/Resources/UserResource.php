<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'organisation' => $this->organisation ?? '',
            'phone' => $this->phone ?? '',
            'roles' => $this->getRoleNames()->values(),
            'partnerId' => $this->partner?->slug,
            'emailVerified' => $this->email_verified_at !== null,
            'approvedAt' => optional($this->approved_at)->toISOString(),
            'reviewNotes' => $this->review_notes,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
