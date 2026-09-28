<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\OpportunityResource;
use App\Models\Opportunity;
use App\Support\HtmlSanitizer;
use Illuminate\Http\Request;

class OpportunityController extends ContentController
{
    protected string $modelClass = Opportunity::class;
    protected string $resourceClass = OpportunityResource::class;
    protected array $searchable = ['title', 'summary', 'description', 'funder', 'sector', 'organization'];

    /**
     * Fields authored in CKEditor. Their HTML is rebuilt from an allow-list
     * on the way in — see App\Support\HtmlSanitizer.
     */
    private const RICH_TEXT = [
        'summary',
        'duties_responsibilities',
        'competences',
        'minimum_education',
        'experience',
    ];
    protected array $filters = [
        'sector' => 'sector',
        'valueChain' => 'value_chain',
        'region' => 'region',
        'featured' => 'featured',
        'type' => 'opportunity_type',
    ];
    protected string $orderBy = 'deadline';
    protected string $orderDir = 'asc';

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'deadline' => 'nullable|date',
            // Published on the public page for people to write to, so a
            // typo here is a vacancy nobody can apply to.
            'applicationEmail' => 'nullable|email|max:255',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'opportunityType' => 'opportunity_type',
            'funder' => 'funder',
            'summary' => 'summary',
            'description' => 'description',
            'amount' => 'amount',
            'currency' => 'currency',
            'sector' => 'sector',
            'valueChain' => 'value_chain',
            'region' => 'region',
            'deadline' => 'deadline',
            'eligibility' => 'eligibility',
            'externalUrl' => 'external_url',
            // The notice, call document or job description as an uploaded
            // file. Optional on every type.
            'documentUrl' => 'document_url',
            'applicationEmail' => 'application_email',
            'featured' => 'featured',
            'published' => 'published',
            // The issuing or hiring body — tenders, procurement notices and
            // vacancies. Grants and investment name a `funder` instead.
            'organization' => 'organization',
            'dutiesResponsibilities' => 'duties_responsibilities',
            'minimumEducation' => 'minimum_education',
            'experience' => 'experience',
            'competences' => 'competences',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        foreach (self::RICH_TEXT as $col) {
            if (array_key_exists($col, $attrs) && is_string($attrs[$col])) {
                $clean = HtmlSanitizer::clean($attrs[$col]);
                // CKEditor serialises a cleared field as "<p>&nbsp;</p>";
                // storing that would make every `if ($summary)` downstream
                // think the field is filled.
                $attrs[$col] = HtmlSanitizer::isBlank($clean) ? '' : $clean;
            }
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        return $attrs;
    }
}
