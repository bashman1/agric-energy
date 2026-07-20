<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Token-based authentication (Sanctum personal access tokens).
 *
 * Partner self-registration creates a PENDING account that an admin must
 * approve before it can log in — matching the platform's onboarding model.
 */
class AuthController extends Controller
{
    /** Public partner self-registration. */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'organisation' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'organisation' => $data['organisation'] ?? null,
            'phone' => $data['phone'] ?? null,
            'status' => User::STATUS_PENDING,
        ]);

        $user->assignRole('partner');

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
