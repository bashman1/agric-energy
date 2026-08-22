<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * An organisation managing its OWN team, from the partner portal.
 *
 * This is not a second copy of UserController. The distinction is the whole
 * point of the class:
 *
 *   UserController      platform-wide. `manage-users`. Every account.
 *   PartnerTeamController  one organisation. `manage-partner-team`. Only
 *                          accounts sharing the caller's partner_id.
 *
 * Two invariants hold everywhere below, and both are load-bearing:
 *
 *  1. partner_id is taken from the AUTHENTICATED USER, never from the
 *     request body. A partner admin cannot name another organisation.
 *  2. Grantable roles are limited to Roles::PARTNER_TEAM_ROLES, which are
 *     all organisation-scoped. Letting a staff role through here would let
 *     an external organisation mint an account that publishes site-wide.
 */
class PartnerTeamController extends Controller
{
    /** The caller's organisation, or a 403 if they are not attached to one. */
    private function partnerId(Request $request): int
    {
        $partnerId = $request->user()->partner_id;

        if ($partnerId === null) {
            throw new AuthorizationException('Your account is not linked to an organisation.');
        }

        return $partnerId;
    }

    /** Everyone in the caller's organisation, including the caller. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage-partner-team');

        $users = User::query()
            ->where('partner_id', $this->partnerId($request))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => UserResource::collection($users),
            'total' => $users->count(),
        ]);
    }

    /** Add a colleague to the caller's organisation. */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage-partner-team');
        $partnerId = $this->partnerId($request);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:50',
            'roles' => 'required|array|min:1',
            // The allow-list, not Roles::ALL. This single rule is what stops
            // an organisation granting itself platform-wide powers.
            'roles.*' => 'in:' . implode(',', Roles::PARTNER_TEAM_ROLES),
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // `password` is cast as `hashed`, and that cast is idempotent.
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'organisation' => $request->user()->organisation,
            // Vouched for by their own organisation's admin, so usable at
            // once — the same reasoning as an admin-created staff account.
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
            'account_type' => 'organization',
            // From the session, never the payload — see invariant 1 above.
            'partner_id' => $partnerId,
        ]);

        $user->forceFill(['email_verified_at' => Carbon::now()])->save();
        $user->syncRoles($data['roles']);

        activity('users')->performedOn($user)->causedBy($request->user())
            ->event('created')->log('Partner admin added ' . $user->email . ' to the organisation');

        return response()->json(['data' => new UserResource($user->fresh('partner'))], 201);
    }

    /** Suspend or reactivate a colleague. Never the caller themselves. */
    public function setStatus(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-partner-team');

        // Membership check before anything else: without it a partner admin
        // could act on any user id they guessed.
        if ($user->partner_id !== $this->partnerId($request)) {
            throw new AuthorizationException('That account is not in your organisation.');
        }

        if ($user->id === $request->user()->id) {
            throw new AuthorizationException('You cannot change your own account status.');
        }

        $data = $request->validate([
            'status' => 'required|in:' . User::STATUS_APPROVED . ',' . User::STATUS_SUSPENDED,
        ]);

        $user->update([
            'status' => $data['status'],
            'approved_at' => $data['status'] === User::STATUS_APPROVED
                ? ($user->approved_at ?? Carbon::now())
                : $user->approved_at,
        ]);

        if ($data['status'] === User::STATUS_SUSPENDED) {
            $user->tokens()->delete(); // force logout everywhere
        }

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }
}
