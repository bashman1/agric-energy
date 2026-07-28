<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Partner;
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
     * Individuals create only a pending User. Organizations additionally
     * create a pending, unpublished Partner draft (linked via
     * users.partner_id) that an admin reviews and publishes into the
     * public directory. All fields land in one DB transaction.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'accountType' => 'required|in:individual,organization',
            // Login account (both types).
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:50',

            // Organization profile (required_if the account is an org).
            'category' => 'required_if:accountType,organization|nullable|string|max:255',
            'orgName' => 'required_if:accountType,organization|nullable|string|max:255',
            'contactEmail' => 'required_if:accountType,organization|nullable|email|max:255',
            'acronym' => 'nullable|string|max:255',
            'registrationNumber' => 'nullable|string|max:255',
            'taxId' => 'nullable|string|max:255',
            'yearEstablished' => 'nullable|string|max:10',
            'website' => 'nullable|string|max:255',
            'orgEmail' => 'nullable|email|max:255',
            'telephone' => 'nullable|string|max:50',
            'physicalAddress' => 'nullable|string|max:1000',
            'postalAddress' => 'nullable|string|max:255',
            'coverageScope' => 'nullable|array',
            'regions' => 'nullable|array',
            'districtCoverage' => 'nullable|array',
            'countries' => 'nullable|array',
            'sectors' => 'nullable|array',
            'valueChains' => 'nullable|array',
            'mission' => 'nullable|string|max:2000',
            'description' => 'nullable|string|max:2000',
            'employeesBand' => 'nullable|string|max:50',
            'branchesBand' => 'nullable|string|max:50',
            'beneficiariesBand' => 'nullable|string|max:50',
            'annualBudgetRange' => 'nullable|string|max:100',
            'expertise' => 'nullable|array',
            'contactName' => 'nullable|string|max:255',
            'contactPosition' => 'nullable|string|max:255',
            'contactPhone' => 'nullable|string|max:50',
            'logo' => 'nullable|string|max:1000',
        ]);

        $isOrg = $data['accountType'] === 'organization';

        $user = DB::transaction(function () use ($data, $isOrg) {
            $partner = $isOrg ? $this->createPartnerDraft($data) : null;

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'organisation' => $isOrg ? ($data['orgName'] ?? null) : null,
                'phone' => $data['phone'] ?? null,
                'status' => User::STATUS_PENDING,
                'account_type' => $data['accountType'],
                'partner_id' => $partner?->id,
            ]);

            $user->assignRole(\App\Support\Roles::PARTNER);

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

    /** Create the pending, unpublished Partner profile for an org registrant. */
    private function createPartnerDraft(array $data): Partner
    {
        return Partner::create([
            'slug' => $this->uniquePartnerSlug($data['orgName']),
            'name' => $data['orgName'],
            'category' => $data['category'] ?? null,
            'acronym' => $data['acronym'] ?? null,
            'registration_number' => $data['registrationNumber'] ?? null,
            'tax_id' => $data['taxId'] ?? null,
            'year_established' => $data['yearEstablished'] ?? null,
            'website' => $data['website'] ?? null,
            'email' => $data['orgEmail'] ?? null,
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
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

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
