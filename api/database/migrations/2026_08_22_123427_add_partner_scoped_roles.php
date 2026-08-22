<?php

use App\Support\Roles;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

/**
 * Create the organisation-scoped roles.
 *
 * A migration rather than a seeder edit: RolesAndAdminSeeder also resets the
 * super-admin account from env, so re-running it on a live database is not
 * something a deploy should do. Roles have to exist before anyone can be
 * granted one, and deploy.sh runs migrations on every release.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (Roles::PARTNER_TEAM_ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    public function down(): void
    {
        // Removing a role would silently strip it from every account that
        // holds it, so only drop the ones nobody is using.
        foreach (Roles::PARTNER_TEAM_ROLES as $name) {
            $role = Role::where('name', $name)->where('guard_name', 'web')->first();
            if ($role && $role->users()->count() === 0) {
                $role->delete();
            }
        }
    }
};
