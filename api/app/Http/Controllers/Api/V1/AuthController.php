<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Partner;
use App\Rules\PhoneNumber;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Token-based authentication (Sanctum personal access tokens).
 *
 * Partner self-registration creates a PENDING account that an admin must
 * approve before it can log in — matching the platform's onboarding model.
 */
class AuthController extends Controller
{
    /**
     * Public partner self-registration.
     *
     * Both account types create a pending User AND a pending, unpublished
     * Partner draft (linked via users.partner_id) that an admin reviews and
     * publishes into the public Ecosystem directory. The two drafts differ in
     * shape, not in kind: an organisation carries registration and governance
     * detail, an individual carries a personal profile — position, expertise,
     * experience. Individuals previously created no profile at all, which left
     * a directory advertised as covering consultants and researchers listing
     * only organisations. All fields land in one DB transaction.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'accountType' => 'required|in:individual,organization',
            // Login account (both types).
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            // Required for BOTH account types: it is a sign-in credential
            // (see login()), not an organisation-only display detail.
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:8|confirmed',
            'phone' => ['nullable', 'string', 'max:50', new PhoneNumber],

            // Organization profile (required_if the account is an org).
            'category' => 'required_if:accountType,organization|nullable|string|max:255',
            'orgName' => 'required_if:accountType,organization|nullable|string|max:255',
            'contactEmail' => 'required_if:accountType,organization|nullable|email|max:255',
            'acronym' => 'nullable|string|max:255',
            'registrationNumber' => 'required_if:accountType,organization|nullable|string|max:255',
            'taxId' => 'required_if:accountType,organization|nullable|string|max:255',
            'yearEstablished' => 'nullable|string|max:10',
            'website' => 'nullable|string|max:255',
            'telephone' => ['nullable', 'string', 'max:50', new PhoneNumber],
            'physicalAddress' => 'required_if:accountType,organization|nullable|string|max:1000',
            'postalAddress' => 'nullable|string|max:255',
            'coverageScope' => 'required_if:accountType,organization|nullable|array',
            'regions' => 'nullable|array',
            'districtCoverage' => 'nullable|array',
            'countries' => 'nullable|array',
            'sectors' => 'required_if:accountType,organization|nullable|array|min:1',
            'valueChains' => 'required|array|min:1',
            'mission' => 'required_if:accountType,organization|nullable|string|max:2000',
            'description' => 'required_if:accountType,organization|nullable|string|max:2000',
            'employeesBand' => 'required_if:accountType,organization|nullable|string|max:50',
            'branchesBand' => 'required_if:accountType,organization|nullable|string|max:50',
            'beneficiariesBand' => 'nullable|string|max:50',
            'annualBudgetRange' => 'nullable|string|max:100',
            'expertise' => 'required_if:accountType,organization|nullable|array|min:1|max:3',
            'contactName' => 'required_if:accountType,organization|nullable|string|max:255',
            'contactPosition' => 'required_if:accountType,organization|nullable|string|max:255',
            'contactPhone' => ['required_if:accountType,organization', 'nullable', 'string', 'max:50', new PhoneNumber],
            // Not asked at registration any more — staff set the funding /
            // implementing type when they review the draft. Still accepted if sent.
            'partnerType' => 'nullable|in:Funding Partner,Implementing Partner',
            'logo' => 'nullable|string|max:1000',

            // Individual profile. Mirrors the organisation's required set at a
            // person's scale: enough for a directory entry that is actually
            // worth browsing, not so much that registering becomes a chore.
            'position' => 'required_if:accountType,individual|nullable|string|max:255',
            'affiliation' => 'nullable|string|max:255',
            'yearsExperience' => 'nullable|string|max:20',
            'bio' => 'required_if:accountType,individual|nullable|string|max:2000',
        ], [
            'expertise.max' => 'Select at most 3 areas of expertise.',
            'position.required_if' => 'Your professional title or position is required.',
            'bio.required_if' => 'A short professional profile is required.',
            'sectors.required_if' => 'Please select at least one sector of operation.',
            'valueChains.required' => 'Please select at least one value chain.',
            'valueChains.min' => 'Please select at least one value chain.',
            'employeesBand.required_if' => 'Please select the number of employees.',
            'branchesBand.required_if' => 'Please select the number of branches.',
        ]);

        // Individuals declare expertise and sectors on the same terms as
        // organisations — the directory filters on both, so a profile without
        // them is invisible to anyone searching for a specialist.
        if ($data['accountType'] === 'individual') {
            $request->validate([
                'expertise' => 'required|array|min:1|max:3',
                'sectors' => 'required|array|min:1',
            ], [
                'expertise.max' => 'Select at most 3 areas of expertise.',
            ]);
        }

        $isOrg = $data['accountType'] === 'organization';

        $user = DB::transaction(function () use ($data, $isOrg) {
            $partner = $isOrg
                ? $this->createPartnerDraft($data)
                : $this->createIndividualDraft($data);

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'username' => $data['username'] ?? null,
                'password' => Hash::make($data['password']),
                'organisation' => $isOrg ? ($data['orgName'] ?? null) : null,
                'phone' => $data['phone'] ?? null,
                'status' => User::STATUS_PENDING,
                'account_type' => $data['accountType'],
                'partner_id' => $partner?->id,
            ]);

            // Whoever registers an organisation becomes its administrator,
            // so the organisation can add its own people without a platform
            // admin doing it for them. That role is organisation-scoped: it
            // confers nothing outside this partner_id. An individual now has a
            // profile too, but it is a profile of one — there is no team to
            // administer — so they stay a plain partner.
            $user->assignRole($isOrg
                ? \App\Support\Roles::PARTNER_ADMIN
                : \App\Support\Roles::PARTNER);

            return $user;
        });

        // Email delivery must never block registration; admin approval is the
        // real gate. Failures (mis-configured SMTP, etc.) are logged only.
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'Registration received. Your account is pending administrator approval.',
            'data' => new UserResource($user),
        ], 201);
    }

    /**
     * Create the pending, unpublished directory profile for an individual.
     *
     * Same table as an organisation — individuals link to projects, themes and
     * resources through the same pivots, and the directory queries one list —
     * with `entity_kind` separating the two so each can be browsed on its own.
     */
    private function createIndividualDraft(array $data): Partner
    {
        return Partner::create([
            'slug' => $this->uniquePartnerSlug($data['name']),
            'name' => $data['name'],
            'entity_kind' => 'individual',
            'type' => 'Individual Expert',
            'category' => 'Individual Expert',
            'position' => $data['position'] ?? null,
            'affiliation' => $data['affiliation'] ?? null,
            'years_experience' => $data['yearsExperience'] ?? null,
            'summary' => $data['bio'] ?? null,
            'description' => $data['bio'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'website' => $data['website'] ?? null,
            'logo' => $data['logo'] ?? null,
            'physical_address' => $data['physicalAddress'] ?? null,
            'coverage_scope' => $data['coverageScope'] ?? [],
            'regions' => $data['regions'] ?? [],
            'district_coverage' => $data['districtCoverage'] ?? [],
            'countries' => $data['countries'] ?? [],
            'sectors' => $data['sectors'] ?? [],
            'value_chains' => $data['valueChains'] ?? [],
            'expertise' => $data['expertise'] ?? [],
            // A person is their own contact; prefilling keeps the public
            // profile complete without asking them the same thing twice.
            'contact_name' => $data['name'],
            'contact_position' => $data['position'] ?? null,
            'contact_email' => $data['email'] ?? null,
            'contact_phone' => $data['phone'] ?? null,
            'published' => false,
            'workflow_status' => Partner::STATUS_PENDING,
        ]);
    }

    /** Create the pending, unpublished Partner profile for an org registrant. */
    private function createPartnerDraft(array $data): Partner
    {
        return Partner::create([
            'slug' => $this->uniquePartnerSlug($data['orgName']),
            'name' => $data['orgName'],
            'entity_kind' => 'organization',
            'category' => $data['category'] ?? null,
            'type' => $data['partnerType'] ?? null,
            'acronym' => $data['acronym'] ?? null,
            'registration_number' => $data['registrationNumber'] ?? null,
            'tax_id' => $data['taxId'] ?? null,
            'year_established' => $data['yearEstablished'] ?? null,
            'website' => $data['website'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['telephone'] ?? null,
            'logo' => $data['logo'] ?? null,
            'physical_address' => $data['physicalAddress'] ?? null,
            'postal_address' => $data['postalAddress'] ?? null,
            'coverage_scope' => $data['coverageScope'] ?? [],
            'regions' => $data['regions'] ?? [],
            'district_coverage' => $data['districtCoverage'] ?? [],
            'countries' => $data['countries'] ?? [],
            'sectors' => $data['sectors'] ?? [],
            'value_chains' => $data['valueChains'] ?? [],
            'summary' => $data['description'] ?? null,
            'mission' => $data['mission'] ?? null,
            'employees_band' => $data['employeesBand'] ?? null,
            'branches_band' => $data['branchesBand'] ?? null,
            'beneficiaries_band' => $data['beneficiariesBand'] ?? null,
            'annual_budget_range' => $data['annualBudgetRange'] ?? null,
            'expertise' => $data['expertise'] ?? [],
            'contact_name' => $data['contactName'] ?? null,
            'contact_position' => $data['contactPosition'] ?? null,
            'contact_email' => $data['contactEmail'] ?? null,
            'contact_phone' => $data['contactPhone'] ?? null,
            'published' => false,
            'workflow_status' => Partner::STATUS_PENDING,
        ]);
    }

    /** Slugify the org name and guarantee uniqueness against existing partners. */
    private function uniquePartnerSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'partner';
        $slug = $base;
        $i = 2;
        while (Partner::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    /** Exchange credentials for an API token. */
    public function login(Request $request): JsonResponse
    {
        // The field is still named `email` because that is what every client
        // sends, but it is an IDENTIFIER: people who registered with a
        // username expect to sign in with it, and being told "must be a valid
        // email" is a dead end. Validated as a plain string for that reason.
        $data = $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        $identifier = trim($data['email']);

        // Email wins on a collision, so an address can never be shadowed by
        // someone else choosing it as their username.
        $user = User::where('email', $identifier)->first()
            ?? User::whereNotNull('username')->where('username', $identifier)->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status === User::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'email' => ['Your account is pending administrator approval.'],
            ]);
        }

        if ($user->status === User::STATUS_SUSPENDED) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been suspended.'],
            ]);
        }

        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'data' => new UserResource($user->load('partner')),
            'token' => $token,
        ]);
    }

    /** Current authenticated user. */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => new UserResource($request->user()->load('partner'))]);
    }

    /** Revoke the token used for the current request. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
