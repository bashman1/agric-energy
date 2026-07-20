<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'submissionType' => $this->submission_type,
            'name' => $this->name,
            'organisation' => $this->organisation ?? '',
            'email' => $this->email,
            'subject' => $this->subject ?? '',
            'message' => $this->message,
            'status' => $this->status,
            'emailStatus' => $this->email_status,
            'adminNotes' => $this->admin_notes ?? '',
            'submittedAt' => optional($this->submitted_at)->toISOString(),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
