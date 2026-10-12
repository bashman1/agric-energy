<?php

use App\Support\Roles;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Split the administrator tier in two.
 *
 * `platform-admin` now means "a super-admin without system configuration".
 * The powers it carried until today — users, content, reports — live on as
 * `organisation-admin`, and every account that held platform-admin moves
 * down to it, so nobody is promoted by a deploy. A super-admin then grants
 * the new platform-admin to whoever should have it.
 */
return new class extends Migration
{
    public function up(): void
    {
        $platform = Role::findOrCreate(Roles::PLATFORM_ADMIN, 'web');
        $organisation = Role::findOrCreate(Roles::ORGANISATION_ADMIN, 'web');

        DB::table('model_has_roles')
            ->where('role_id', $platform->id)
            ->update(['role_id' => $organisation->id]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $organisation = Role::where('name', Roles::ORGANISATION_ADMIN)->where('guard_name', 'web')->first();
        if (! $organisation) {
            return;
        }

        // Anyone promoted to the new platform-admin since keeps it; the
        // organisation admins rejoin them, as the two were one role before.
        $platform = Role::findOrCreate(Roles::PLATFORM_ADMIN, 'web');
        foreach (DB::table('model_has_roles')->where('role_id', $organisation->id)->get() as $row) {
            DB::table('model_has_roles')->updateOrInsert([
                'role_id' => $platform->id,
                'model_type' => $row->model_type,
                'model_id' => $row->model_id,
            ], []);
        }
        DB::table('model_has_roles')->where('role_id', $organisation->id)->delete();
        $organisation->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
