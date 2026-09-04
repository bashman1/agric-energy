<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Strip the baked-in hostname from stored upload URLs.
 *
 * MediaController used to return Storage::disk('public')->url($path), which is
 * built from APP_URL. APP_URL is `http://localhost:8000` in the shipped .env,
 * so every upload — including ones made ON the UAT server through the admin
 * panel — was saved as `http://localhost:8000/storage/uploads/...`. The file
 * landed on the right disk; only the URL pointed at a machine no visitor can
 * reach, which is why an uploaded featured image showed locally and nowhere
 * else. The controller now returns a root-relative path.
 *
 * This repairs the rows already written. It rewrites rather than clears: the
 * file usually exists on the server that took the upload, so dropping the URL
 * would throw away a working image to fix a broken prefix.
 *
 * Only the host is removed, and only for loopback hosts on a /storage/ path.
 * A genuinely remote URL — a partner logo hosted on nrep.ug, an external
 * resource link — is left exactly as it is.
 */
return new class extends Migration
{
    /**
     * Columns that can hold an uploaded media URL. Deliberately excludes the
     * *_external_url and registration_url columns: those are links to other
     * people's sites, not uploads, and a loopback value there is someone's
     * typo rather than this bug.
     */
    private const COLUMNS = [
        'projects' => ['featured_image'],
        'partners' => ['logo'],
        'posts' => ['featured_image'],
        'events' => ['featured_image'],
        'resources' => ['featured_image', 'file_url'],
        'technologies' => ['featured_image'],
        'themes' => ['featured_image'],
        'policies' => ['document_url'],
    ];

    /** Hostnames that only ever resolve on the machine that wrote them. */
    private const LOOPBACK = [
        'http://localhost:8000',
        'https://localhost:8000',
        'http://127.0.0.1:8000',
        'https://127.0.0.1:8000',
        'http://localhost',
        'http://127.0.0.1',
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $table => $columns) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if (! DB::getSchemaBuilder()->hasColumn($table, $column)) {
                    continue;
                }

                foreach (self::LOOPBACK as $host) {
                    DB::table($table)
                        ->where($column, 'like', $host . '/storage/%')
                        ->update([
                            $column => DB::raw(
                                "REPLACE({$column}, '{$host}/storage/', '/storage/')"
                            ),
                        ]);
                }

                $this->clearMissingUploads($table, $column);
            }
        }
    }

    /**
     * Drop upload paths with no file behind them ON THIS SERVER.
     *
     * The hostname rewrite above is only half the repair. An upload made on a
     * developer's laptop was written to that laptop's disk, so on UAT the
     * corrected path resolves to nothing and renders as a broken image — worse
     * than no image, because coverImage() would otherwise fall back to a brand
     * default. Which files are real differs per environment, and this migration
     * runs on each one, so it can simply look.
     *
     * Scoped to /storage/uploads/ so it can only ever touch uploaded media —
     * never a bundled frontend asset or a link to another site.
     */
    private function clearMissingUploads(string $table, string $column): void
    {
        $rows = DB::table($table)
            ->select('id', $column)
            ->where($column, 'like', '/storage/uploads/%')
            ->get();

        foreach ($rows as $row) {
            $path = ltrim(substr($row->{$column}, strlen('/storage/')), '/');

            if (! Storage::disk('public')->exists($path)) {
                DB::table($table)->where('id', $row->id)->update([$column => '']);
            }
        }
    }

    /**
     * Not reversed. Putting a developer's loopback hostname back into rows
     * that are now correct everywhere would only reinstate the bug.
     */
    public function down(): void
    {
        //
    }
};
