<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Rules\PhoneNumber;
use App\Http\Resources\UserResource;
use App\Models\Partner;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Administrator account management: list users, approve pending registrations,
 * assign roles, and suspend/reactivate accounts. Restricted to user managers
 * (the three administrator tiers, Roles::ADMIN_TIERS) via the `manage-users`
 * gate.
 *
 * Who may hand out an administrator role (assertMayGrant()):
 *  - super-admin is never granted or revoked through the API — a new one is
 *    made on the server (seeder / artisan), so no UI session can mint one;
 *  - platform-admin and organisation-admin are granted or revoked by a
 *    super-admin or platform admin only, so an organisation admin can
 *    neither multiply itself nor promote anyone.
 * An administrator also never sees an account in a tier above their own:
 * those are left out of the listing and 404 on every per-user action
 * (assertMayManage()). Without that, resetting a senior account's password
 * would be a way to borrow its powers.
 */
class UserController extends Controller
{
    private const ASSIGNABLE_ROLES = Roles::ALL;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage-users');

        $query = User::query()->with('partner')->orderByDesc('created_at');

        if ($hidden = $this->outranking($request)) {
            $query->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', $hidden));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('role')) {
            $query->role($request->query('role'));
        }

        $users = $query->get();

        return response()->json([
            'data' => UserResource::collection($users),
            'total' => $users->count(),
        ]);
    }

    /**
     * Create an account directly, instead of waiting for someone to
     * self-register and then approving them.
     *
     * Admin-created accounts skip the pending state: the person creating it
     * is the same person who would otherwise approve it, so requiring a
     * second approval step would be theatre. Email is likewise marked
     * verified — an administrator typing the address is the verification.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage-users');

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            // `confirmed` pairs with password_confirmation, matching the
            // rules self-registration already enforces in AuthController.
            'password' => 'required|string|min:8|confirmed',
            'phone' => ['nullable', 'string', 'max:50', new PhoneNumber],
            'organisation' => 'nullable|string|max:255',
            // Slug of the organisation a partner account belongs to. Without
            // it an organisation role has no team to act on — see
            // assertCoherentRoles().
            'partner' => 'nullable|string|exists:partners,slug',
            'roles' => 'required|array|min:1',
            'roles.*' => 'in:' . implode(',', self::ASSIGNABLE_ROLES),
        ]);

        $partner = ! empty($data['partner'])
            ? Partner::where('slug', $data['partner'])->first()
            : null;
        $this->assertCoherentRoles($data['roles'], $partner?->id);

        // Same escalation guard as setRoles().
        $this->assertMayGrant($request, $data['roles'], []);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // The model casts `password` as `hashed`, and that cast is
            // idempotent — do not Hash::make() here as well.
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'organisation' => $data['organisation'] ?? $partner?->name,
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
            'account_type' => $partner ? 'organization' : 'individual',
            'partner_id' => $partner?->id,
        ]);

        $user->forceFill(['email_verified_at' => Carbon::now()])->save();
        $user->syncRoles($data['roles']);

        activity('users')->performedOn($user)->causedBy($request->user())
            ->event('created')->log('Created account ' . $user->email);

        return response()->json(['data' => new UserResource($user->fresh('partner'))], 201);
    }

    /**
     * Edit an account: profile details, organisation link, role, and
     * optionally a new password. Every field is optional — only what is sent
     * changes. `partner: null` unlinks the organisation; leaving the key out
     * keeps it.
     *
     * Runs the same guards as setRoles(): an administrator cannot touch an
     * account above their tier (404), nobody changes super-admin membership,
     * and an organisation admin changes no administrator membership at all.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');
        $this->assertMayManage($request, $user);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => ['nullable', 'string', 'max:50', new PhoneNumber],
            'organisation' => 'nullable|string|max:255',
            'partner' => 'nullable|string|exists:partners,slug',
            'roles' => 'sometimes|array|min:1',
            'roles.*' => 'in:' . implode(',', self::ASSIGNABLE_ROLES),
        ]);

        $partnerId = $user->partner_id;
        if ($request->exists('partner')) {
            $partnerId = ! empty($data['partner'])
                ? Partner::where('slug', $data['partner'])->value('id')
                : null;
        }

        $roles = $data['roles'] ?? $user->getRoleNames()->all();
        $this->assertMayGrant($request, $roles, $user->getRoleNames()->all());
        $this->assertCoherentRoles($roles, $partnerId);

        $user->fill(collect($data)->only(['name', 'email', 'phone', 'organisation'])->all());
        $user->partner_id = $partnerId;
        if ($request->exists('partner')) {
            $user->account_type = $partnerId ? 'organization' : 'individual';
        }
        if (! empty($data['password'])) {
            // `password` is cast as `hashed`.
            $user->password = $data['password'];
        }
        $user->save();

        if (isset($data['roles'])) {
            $user->syncRoles($roles);
        }
        // A reset password signs the person out everywhere — unless it is
        // the admin's own, which would end the session doing the editing.
        if (! empty($data['password']) && $user->id !== $request->user()->id) {
            $user->tokens()->delete();
        }

        activity('users')->performedOn($user)->causedBy($request->user())
            ->event('updated')->log('Edited account ' . $user->email);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    /** Approve a pending registration so the user can log in. */
    public function approve(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');
        $this->assertMayManage($request, $user);

        $user->update([
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
        ]);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');
        $this->assertMayManage($request, $user);

        $user->update(['status' => User::STATUS_SUSPENDED]);
        $user->tokens()->delete(); // force logout everywhere

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    /** Replace a user's roles (staff role assignment). */
    public function setRoles(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');

        $data = $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'in:' . implode(',', self::ASSIGNABLE_ROLES),
            // Lets an existing partner account be linked to its organisation
            // in the same step as being made its administrator.
            'partner' => 'nullable|string|exists:partners,slug',
        ]);

        if (! empty($data['partner'])) {
            $partner = Partner::where('slug', $data['partner'])->firstOrFail();
            $user->forceFill([
                'partner_id' => $partner->id,
                'account_type' => 'organization',
                'organisation' => $user->organisation ?: $partner->name,
            ]);
        }

        // Checked before the partner link below is saved.
        $this->assertMayManage($request, $user);
        $this->assertMayGrant($request, $data['roles'], $user->getRoleNames()->all());
        $this->assertCoherentRoles($data['roles'], $user->partner_id);

        $user->save();
        $user->syncRoles($data['roles']);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    /**
     * An account is either NREP staff or a partner, never both: a partner
     * account holding a staff role would carry platform-wide powers out of
     * an external organisation. And the organisation roles mean nothing
     * without an organisation — a partner-admin with no partner_id fails the
     * `manage-partner-team` gate, so the portal's Team page would 403.
     */
    private function assertCoherentRoles(array $roles, ?int $partnerId): void
    {
        $staff = array_diff($roles, Roles::PARTNER_ROLES);
        $partner = array_intersect($roles, Roles::PARTNER_ROLES);

        if ($staff && $partner) {
            throw ValidationException::withMessages([
                'roles' => 'An account cannot hold both NREP staff and partner roles.',
            ]);
        }
        if (array_intersect($roles, Roles::PARTNER_TEAM_ROLES) && $partnerId === null) {
            throw ValidationException::withMessages([
                'roles' => 'Organisation roles need the account to be linked to a partner organisation.',
            ]);
        }
    }

    /**
     * Refuse any change to who holds an administrator role, comparing the
     * requested roles with the ones the account has now ($current is empty
     * for a new account):
     *  - super-admin membership never changes through the API, for anyone;
     *  - platform-admin and organisation-admin membership changes only at the
     *    hand of a super-admin or platform admin.
     */
    private function assertMayGrant(Request $request, array $requested, array $current): void
    {
        $changes = fn (string $role) =>
            in_array($role, $requested, true) !== in_array($role, $current, true);

        if ($changes(Roles::SUPER_ADMIN)) {
            throw new AuthorizationException('Super-administrator accounts cannot be created or changed from the platform.');
        }
        if (($changes(Roles::PLATFORM_ADMIN) || $changes(Roles::ORGANISATION_ADMIN))
            && ! $request->user()->hasAnyRole([Roles::SUPER_ADMIN, Roles::PLATFORM_ADMIN])) {
            throw new AuthorizationException('Only super or platform administrators can grant or remove an administrator role.');
        }
    }

    /**
     * An account in an administrator tier above the caller's may not be
     * modified. To the caller it does not exist — 404, matching its absence
     * from index() — rather than a 403 that would confirm it is there.
     */
    private function assertMayManage(Request $request, User $target): void
    {
        if ($target->hasAnyRole($this->outranking($request))) {
            abort(404);
        }
    }

    /** The administrator roles above the caller's own tier. */
    private function outranking(Request $request): array
    {
        return Roles::outranking($request->user()->getRoleNames()->all());
    }
}
