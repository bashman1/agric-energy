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
 * Administrator account management: list users, approve pending registrations,
 * assign roles, and suspend/reactivate accounts. Restricted to user managers
 * (platform-admins and super-admins) via the `manage-users` gate. The
 * super-admin role itself — granting it, or acting on an account that holds it
 * — is reserved for super-admins (see assertMayManageSuperAdmins()).
 */
class UserController extends Controller
{
    private const ASSIGNABLE_ROLES = Roles::ALL;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage-users');

        $query = User::query()->with('partner')->orderByDesc('created_at');

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
            'phone' => 'nullable|string|max:50',
            'organisation' => 'nullable|string|max:255',
            'roles' => 'required|array|min:1',
            'roles.*' => 'in:' . implode(',', self::ASSIGNABLE_ROLES),
        ]);

        // Same escalation guard as setRoles(): a platform-admin must not be
        // able to mint a super-admin and inherit full control that way.
        if (in_array(Roles::SUPER_ADMIN, $data['roles'], true)
            && ! $request->user()->hasRole(Roles::SUPER_ADMIN)) {
            throw new AuthorizationException('Only super-administrators can grant the super-administrator role.');
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // The model casts `password` as `hashed`, and that cast is
            // idempotent — do not Hash::make() here as well.
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'organisation' => $data['organisation'] ?? null,
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
            'account_type' => 'individual',
        ]);

        $user->forceFill(['email_verified_at' => Carbon::now()])->save();
        $user->syncRoles($data['roles']);

        activity('users')->performedOn($user)->causedBy($request->user())
            ->event('created')->log('Created account ' . $user->email);

        return response()->json(['data' => new UserResource($user->fresh('partner'))], 201);
    }

    /** Approve a pending registration so the user can log in. */
    public function approve(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');
        $this->assertMayManageSuperAdmins($request, $user);

        $user->update([
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
        ]);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');
        $this->assertMayManageSuperAdmins($request, $user);

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
        ]);

        // Granting super-admin, or changing the roles of an existing
        // super-admin, is reserved for super-admins — a platform-admin must
        // not be able to escalate itself or others to full control.
        $this->assertMayManageSuperAdmins($request, $user);
        if (in_array(Roles::SUPER_ADMIN, $data['roles'], true)
            && ! $request->user()->hasRole(Roles::SUPER_ADMIN)) {
            throw new AuthorizationException('Only super-administrators can grant the super-administrator role.');
        }

        $user->syncRoles($data['roles']);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    /**
     * A super-admin account may only be modified by another super-admin.
     * Platform-admins manage everyone else but cannot touch the top tier.
     */
    private function assertMayManageSuperAdmins(Request $request, User $target): void
    {
        if ($target->hasRole(Roles::SUPER_ADMIN)
            && ! $request->user()->hasRole(Roles::SUPER_ADMIN)) {
            throw new AuthorizationException('Only super-administrators can manage super-administrator accounts.');
        }
    }
}
