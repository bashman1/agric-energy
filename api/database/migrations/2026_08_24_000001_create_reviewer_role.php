<?php

use App\Support\Roles;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Reinstate `reviewer` as a role in its own right.
 *
 * It was merged into knowledge-manager by the 2026_07_26 remap on the reasoning
 * that "both were content-review roles". That collapsed a distinction worth
 * keeping: knowledge-manager both authors and publishes, so a platform staffed
 * only with knowledge-managers has nobody who can check work they did not
 * write. `reviewer` exists to be that person — it approves and returns
 * submissions and can author nothing, so its sign-off is always independent.
 *
 * See App\Support\Roles::REVIEWERS and ContentPolicy::review(), which also
 * refuses to let anyone approve a record they authored themselves.
 */
return new class extends Migration
{
    public function up(): void
    {
        Role::findOrCreate(Roles::REVIEWER, 'web');

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Only drop it if nobody holds it — deleting an assigned role would
        // silently strip review rights from whoever had them.
        $role = Role::where('name', Roles::REVIEWER)->where('guard_name', 'web')->first();

        if ($role && $role->users()->count() === 0) {
            $role->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
