<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Migrates the legacy role set (editor, reviewer, partner) to the new four-role
 * scheme (super-admin, platform-admin, knowledge-manager, content-contributor).
 *
 *   editor   → knowledge-manager
 *   reviewer → knowledge-manager   (merged; both were content-review roles)
 *   partner  → content-contributor
 *   super-admin                    (unchanged)
 *   platform-admin                 (new — created empty, assigned via the UI)
 *
 * Renaming a role row preserves its model_has_roles assignments; reviewer is
 * merged into knowledge-manager by moving its assignments, then dropped.
 */
return new class extends Migration
{
    private string $guard = 'web';

    public function up(): void
    {
        // 1. editor → knowledge-manager (rename keeps assignments in place).
        $editor = Role::where('name', 'editor')->where('guard_name', $this->guard)->first();
        if ($editor) {
            $editor->update(['name' => 'knowledge-manager']);
        }

        // Ensure the target role exists whether or not `editor` was present.
        $km = Role::firstOrCreate(['name' => 'knowledge-manager', 'guard_name' => $this->guard]);

        // 2. reviewer → knowledge-manager (merge assignments, then drop role).
        $reviewer = Role::where('name', 'reviewer')->where('guard_name', $this->guard)->first();
        if ($reviewer) {
            $rows = DB::table('model_has_roles')->where('role_id', $reviewer->id)->get();
            foreach ($rows as $row) {
                DB::table('model_has_roles')->updateOrInsert([
                    'role_id' => $km->id,
                    'model_type' => $row->model_type,
                    'model_id' => $row->model_id,
                ], []);
            }
            DB::table('model_has_roles')->where('role_id', $reviewer->id)->delete();
            $reviewer->delete();
        }

        // 3. partner → content-contributor (rename keeps assignments).
        $partner = Role::where('name', 'partner')->where('guard_name', $this->guard)->first();
        if ($partner) {
            $partner->update(['name' => 'content-contributor']);
        }

        // 4. Guarantee the full new set exists.
        foreach (['super-admin', 'platform-admin', 'knowledge-manager', 'content-contributor'] as $name) {
            Role::firstOrCreate(['name' => $name, 'guard_name' => $this->guard]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Best-effort reverse mapping (reviewer/editor split cannot be restored;
        // both come back as `editor`).
        $km = Role::where('name', 'knowledge-manager')->where('guard_name', $this->guard)->first();
        if ($km) {
            $km->update(['name' => 'editor']);
        }
        $cc = Role::where('name', 'content-contributor')->where('guard_name', $this->guard)->first();
        if ($cc) {
            $cc->update(['name' => 'partner']);
        }
        Role::where('name', 'platform-admin')->where('guard_name', $this->guard)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
