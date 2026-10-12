<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Establishes the RBAC role set and the initial super-admin account.
 * Roles: super-admin, platform-admin, organisation-admin, knowledge-manager, …
 * (see App\Support\Roles).
 */
class RolesAndAdminSeeder extends Seeder
{
    public const ROLES = Roles::ALL;

    public function run(): void
    {
        foreach (self::ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }

        $admin = User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@agrienergy.go.ug')],
            [
                'name' => 'Platform Administrator',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'agrienergy2026')),
                'status' => User::STATUS_APPROVED,
                'organisation' => 'NREP Secretariat',
                'email_verified_at' => Carbon::now(),
                'approved_at' => Carbon::now(),
            ]
        );

        $admin->syncRoles(['super-admin']);
    }
}
