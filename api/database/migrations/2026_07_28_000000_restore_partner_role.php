<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Re-introduces the `partner` role alongside the four-role scheme. The earlier
 * remap folded `partner` into `content-contributor`; partners are a distinct
 * account type (external orgs on the /partner portal) and are kept separate.
 *
 * Self-registered accounts that were auto-assigned `partner` (individual/org
 * signups, identifiable by NOT holding any staff/admin role) are moved back
 * from `content-contributor` to `partner`.
 */
return new class extends Migration
{
    private string $guard = 'web';

    public function up(): void
    {
        $partner = Role::firstOrCreate(['name' => 'partner', 'guard_name' => $this->guard]);
        $contributor = Role::where('name', 'content-contributor')->where('guard_name', $this->guard)->first();

        if ($contributor) {
            // A registrant only ever held content-contributor (from the earlier
            // remap). Anyone holding it AND no manager/admin role is a former
            // partner registrant → restore them to partner.
            $staffRoleIds = Role::whereIn('name', ['super-admin', 'platform-admin', 'knowledge-manager'])
                ->where('guard_name', $this->guard)->pluck('id');

            $rows = DB::table('model_has_roles')->where('role_id', $contributor->id)->get();
            foreach ($rows as $row) {
                $alsoStaff = DB::table('model_has_roles')
                    ->where('model_type', $row->model_type)
                    ->where('model_id', $row->model_id)
                    ->whereIn('role_id', $staffRoleIds)
                    ->exists();
                if ($alsoStaff) {
                    continue; // genuine internal contributor — leave as-is
                }
                DB::table('model_has_roles')->updateOrInsert([
                    'role_id' => $partner->id,
                    'model_type' => $row->model_type,
                    'model_id' => $row->model_id,
                ], []);
                DB::table('model_has_roles')
                    ->where('role_id', $contributor->id)
                    ->where('model_type', $row->model_type)
                    ->where('model_id', $row->model_id)
                    ->delete();
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Fold partners back into content-contributor.
        $partner = Role::where('name', 'partner')->where('guard_name', $this->guard)->first();
        $contributor = Role::firstOrCreate(['name' => 'content-contributor', 'guard_name' => $this->guard]);
        if ($partner) {
            DB::table('model_has_roles')->where('role_id', $partner->id)
                ->update(['role_id' => $contributor->id]);
            $partner->delete();
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
