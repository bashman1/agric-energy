<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Administrator account management: list users, approve pending partner
 * registrations, assign roles, and suspend/reactivate accounts. Restricted to
 * super-admins via the `manage-users` gate.
 */
class UserController extends Controller
{
    private const ASSIGNABLE_ROLES = ['super-admin', 'editor', 'reviewer', 'partner'];

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

    /** Approve a pending registration so the partner can log in. */
    public function approve(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');

        $user->update([
            'status' => User::STATUS_APPROVED,
            'approved_at' => Carbon::now(),
        ]);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        $this->authorize('manage-users');

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

        $user->syncRoles($data['roles']);

        return response()->json(['data' => new UserResource($user->fresh('partner'))]);
    }
}
