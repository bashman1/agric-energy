<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Give the three homepage projects real cover art, and clear the broken
 * upload URLs pointing at a developer's machine.
 *
 * A project's featuredImage surfaces in exactly one public place — the
 * homepage hero deck (HeroPhotoDeck), at aspect-[3/4] with a dark scrim over
 * the lower third for the title. The three covers added alongside this
 * migration are drawn to that frame: UI/public/covers/*.svg, in the same
 * house style as UI/public/defaults, with the motif kept clear of the scrim.
 *
 * They ship with the frontend build rather than living in the uploads
 * directory, so they exist in every environment and cannot 404 the way a
 * storage path does when storage/ is not part of the deploy.
 *
 * Separately: four projects carried `http://localhost:8000/storage/...` as
 * their featured image. An absolute URL to a developer's loopback address is
 * broken everywhere else, and the files behind these were accidental uploads
 * (desktop screenshots, a receipt, an unrelated flyer) rather than project
 * photography — so on a public site they were worse than no image at all.
 * Clearing the value is not a loss: coverImage() falls back to a brand
 * default cover keyed off the slug, which is what these pages showed before
 * anyone uploaded anything.
 */
return new class extends Migration
{
    /** slug => cover shipped in the frontend build. */
    private const COVERS = [
        'project-010' => '/covers/aggregation-network.svg',
        'project-004' => '/covers/solar-drying.svg',
        'project-002' => '/covers/biogas-dairy.svg',
    ];

    public function up(): void
    {
        // Assign a cover only where the project has NO image of its own — an
        // empty column, nothing more. A loopback URL is not treated as absent
        // here even though it is broken: the file behind it usually exists on
        // whichever server took the upload, so the next migration repairs the
        // path and only clears it if there is genuinely no file. Claiming
        // those rows here would overwrite a real photo with stock artwork
        // before anything had a chance to fix it.
        foreach (self::COVERS as $slug => $path) {
            DB::table('projects')
                ->where('slug', $slug)
                ->where(fn ($q) => $q
                    ->whereNull('featured_image')
                    ->orWhere('featured_image', ''))
                ->update(['featured_image' => $path, 'updated_at' => now()]);
        }
    }

    /**
     * Detaches the covers again. The cleared loopback URLs are deliberately
     * not restored — they never resolved for anyone but the machine that
     * uploaded them, and two of the images were personal screenshots that
     * should not go back onto a public page.
     */
    public function down(): void
    {
        DB::table('projects')
            ->whereIn('featured_image', array_values(self::COVERS))
            ->update(['featured_image' => '', 'updated_at' => now()]);
    }
};
