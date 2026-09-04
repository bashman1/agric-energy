<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Align the four Collaborating Partners across every environment.
 *
 * The homepage slider names its four partners by slug (UI/app/page.tsx), and
 * anything named there that is not published simply drops out. The slugs and
 * the records therefore have to be kept in step — but the records are DATA,
 * so fixing them in a local database fixed nothing on UAT: the slider fell
 * back to the two that happened to match and rendered SNV and MAAIF only.
 *
 * Hence a migration rather than a psql session. It travels with the deploy,
 * runs from `php artisan migrate --force`, and — unlike a seeder in the
 * release path — runs exactly once, so it cannot quietly revert an
 * administrator's later edits on every deploy.
 *
 * Three things are wrong in a database seeded before 2026-09-04:
 *   1. MEMD is stored under the slug `practical-action-uganda`, left over
 *      from whichever record that file started life as. The name has said
 *      "Ministry of Energy and Mineral Development" throughout.
 *   2. NREP was seeded as an unpublished draft, so it never appeared.
 *   3. MAAIF, NREP and MEMD point at remote logo URLs on third-party sites.
 *      The logos now ship with the build, so they cannot vanish when someone
 *      else's CMS is rearranged.
 *
 * Every step is guarded, because environments disagree about which of these
 * are already true.
 */
return new class extends Migration
{
    /** slug => logo shipped in the frontend build (api/public/static/logos). */
    private const LOGOS = [
        'maaif' => '/logos/maaif.png',
        'nrep'  => '/logos/nrep.png',
        'memd'  => '/logos/memd.png',
    ];

    /** The slider's four, in the order the homepage lists them. */
    private const SLIDER = ['snv-uganda', 'maaif', 'nrep', 'memd'];

    public function up(): void
    {
        // 1. Rename MEMD onto the slug the slider asks for. Skipped entirely
        //    if `memd` already exists — that means either this ran before or
        //    the environment was seeded after the rename, and in both cases
        //    renaming again would collide with the unique index.
        $memdExists = DB::table('partners')->where('slug', 'memd')->exists();
        $legacy = DB::table('partners')->where('slug', 'practical-action-uganda')->first();

        if (! $memdExists && $legacy !== null) {
            DB::table('partners')->where('id', $legacy->id)->update([
                'slug' => 'memd',
                'updated_at' => now(),
            ]);
        }

        // 2. NREP is named in the slider, so it has to exist. It was seeded as
        //    a draft in some environments and is missing outright in others.
        if (! DB::table('partners')->where('slug', 'nrep')->exists()) {
            DB::table('partners')->insert([
                'slug' => 'nrep',
                'name' => 'National Renewable Energy Platform (NREP)',
                'entity_kind' => 'organization',
                'type' => 'Local NGO',
                'summary' => "Uganda's national platform for renewable energy knowledge, "
                    . 'coordination, and sector support.',
                'website' => 'https://www.nrep.go.ug',
                'email' => 'info@nrep.go.ug',
                'logo' => self::LOGOS['nrep'],
                'regions' => json_encode(['Central', 'Eastern', 'Northern', 'Western']),
                'featured' => true,
                'published' => true,
                'workflow_status' => 'published',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Point the three at the logos that ship with the build. Only
        //    touched where the stored value is still a remote URL, so a logo
        //    someone has since uploaded through the admin panel is left alone.
        foreach (self::LOGOS as $slug => $path) {
            DB::table('partners')
                ->where('slug', $slug)
                ->where(function ($q) {
                    $q->whereNull('logo')
                        ->orWhere('logo', '')
                        ->orWhere('logo', 'like', 'http%');
                })
                ->update(['logo' => $path, 'updated_at' => now()]);
        }

        // 4. The slider only renders published records, and marks them
        //    featured so they also surface in the partners directory.
        DB::table('partners')
            ->whereIn('slug', self::SLIDER)
            ->update([
                'published' => true,
                'featured' => true,
                'workflow_status' => 'published',
                'updated_at' => now(),
            ]);
    }

    /**
     * Only the rename is reversed. Publishing a partner and pointing it at a
     * bundled logo are not damage to undo — rolling them back would take the
     * public site backwards for no reason, and the logo it previously held
     * was a URL on a site we do not control.
     */
    public function down(): void
    {
        if (! DB::table('partners')->where('slug', 'practical-action-uganda')->exists()) {
            DB::table('partners')
                ->where('slug', 'memd')
                ->update(['slug' => 'practical-action-uganda', 'updated_at' => now()]);
        }
    }
};
