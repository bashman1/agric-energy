<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ProjectResource;
use App\Models\Partner;
use App\Rules\EmailAddress;
use App\Models\Project;
use App\Models\Technology;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectController extends ContentController
{
    protected string $modelClass = Project::class;
    protected string $resourceClass = ProjectResource::class;
    protected array $with = ['technologies', 'themes', 'partners'];
    protected array $searchable = ['title', 'summary', 'description', 'region', 'district', 'location_note'];
    protected array $filters = [
        'region' => 'region',
        'district' => 'district',
        'valueChain' => 'value_chain',
        'status' => 'status',
        'featured' => 'featured',
    ];
    protected array $relationFilters = [
        'technologyId' => ['technologies', 'slug'],
        'themeId' => ['themes', 'slug'],
        'partnerId' => ['partners', 'slug'],
    ];

    protected function validatePayload(Request $request, bool $updating = false): array
    {
        $request->validate([
            'title' => ($updating ? 'sometimes' : 'required') . '|string|max:255',
            'summary' => 'nullable|string|max:2000',
            'coordinates.lat' => 'nullable|numeric',
            'coordinates.lng' => 'nullable|numeric',
            'partnerRole' => 'nullable|in:funding,implementing',
            // Required once a role is chosen — the address is the whole
            // reason the role is asked for.
            'partnerEmail' => ['required_with:partnerRole', 'nullable', 'string', 'max:255', new EmailAddress],
        ], [
            'partnerEmail.required_with' => 'Enter the partner\'s email address.',
        ]);

        return $request->all();
    }

    protected function inboundAttributes(array $data, bool $updating = false): array
    {
        $map = [
            'title' => 'title',
            'summary' => 'summary',
            'description' => 'description',
            'region' => 'region',
            'district' => 'district',
            'regions' => 'regions',
            'districts' => 'districts',
            'locationNote' => 'location_note',
            'fundingPartner' => 'funding_partner',
            'budget' => 'budget',
            'budgetCurrency' => 'budget_currency',
            'beneficiaryCount' => 'beneficiary_count',
            'valueChain' => 'value_chain',
            'beneficiaries' => 'beneficiaries',
            'status' => 'status',
            'startDate' => 'start_date',
            'endDate' => 'end_date',
            'outcomes' => 'outcomes',
            'featuredImage' => 'featured_image',
            'gallery' => 'gallery',
            'attachments' => 'attachments',
            'externalUrl' => 'external_url',
            'featured' => 'featured',
            'published' => 'published',
            'notifyPartnerIds' => 'notify_partner_ids',
            'partnerRole' => 'partner_role',
            'partnerEmail' => 'partner_email',
        ];

        $attrs = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) {
                $attrs[$col] = $data[$in];
            }
        }

        if (isset($data['coordinates'])) {
            $attrs['lat'] = $data['coordinates']['lat'] ?? null;
            $attrs['lng'] = $data['coordinates']['lng'] ?? null;
        }

        if (! $updating && isset($data['title'])) {
            $attrs['slug'] = $data['slug'] ?? $data['title'];
        }

        // The create form no longer asks for a funding partner and a list of
        // implementing partners: it asks for ONE role and ONE partner email.
        // Write that through to the fields the public project page already
        // renders, so nothing on the site has to change and older projects
        // keep working. An address matching no registered partner is still
        // stored on partner_email and still gets notified at publish time.
        $role = $data['partnerRole'] ?? null;
        $email = trim((string) ($data['partnerEmail'] ?? ''));

        if ($role && $email !== '') {
            $partner = Partner::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();

            // Only a resolved partner's NAME goes into the public display
            // field. Writing the raw address there would publish someone's
            // email on the project page in place of an organisation name.
            if ($role === 'funding' && $partner) {
                $attrs['funding_partner'] = $partner->name;
            }

            // Nominating them for the publish notification is the whole point
            // of collecting the address, so this happens for both roles.
            // MERGED, not assigned: the form still has a separate "Partners
            // to notify on publish" picker, and overwriting it here would
            // silently drop everyone the author chose there.
            if ($partner) {
                $existing = $attrs['notify_partner_ids'] ?? ($data['notifyPartnerIds'] ?? []);
                $attrs['notify_partner_ids'] = array_values(
                    array_unique(array_merge(is_array($existing) ? $existing : [], [$partner->slug]))
                );
            }
        }

        return $attrs;
    }

    /** Keys a pending revision must carry so approval can re-sync them. */
    protected function relationKeys(): array
    {
        return [
            'technologyIds',
            'themeIds',
            'implementingPartnerIds',
            'partnerRole',
            'partnerEmail',
        ];
    }

    protected function syncRelations(Model $model, array $data): void
    {
        /** @var Project $model */
        if (array_key_exists('technologyIds', $data)) {
            $model->technologies()->sync($this->idsForSlugs(Technology::class, $data['technologyIds'] ?? []));
        }
        if (array_key_exists('themeIds', $data)) {
            $model->themes()->sync($this->idsForSlugs(Theme::class, $data['themeIds'] ?? []));
        }
        if (array_key_exists('implementingPartnerIds', $data)) {
            $ids = $this->idsForSlugs(Partner::class, $data['implementingPartnerIds'] ?? []);
            $model->partners()->sync(array_fill_keys($ids, ['role' => 'implementing']));
        }

        // `partnerRole: implementing` is the pivot's new entry point. Only
        // touched when the form actually sent a role, so an update that does
        // not mention it leaves an existing list alone.
        if (($data['partnerRole'] ?? null) === 'implementing') {
            $email = trim((string) ($data['partnerEmail'] ?? ''));
            $partner = $email === ''
                ? null
                : Partner::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();

            $model->partners()->sync(
                $partner ? [$partner->id => ['role' => 'implementing']] : []
            );
        }
    }
}
