<?php

namespace App\Console\Commands;

use App\Models\Resource;
use App\Support\ResourceFileStore;
use Illuminate\Console\Command;

/**
 * Move already-restricted files onto the private disk.
 *
 * The observer handles everything saved from now on, but resources marked
 * "view online only" before that existed still have their files sitting on the
 * public disk under a permanent URL. Nothing will save them on its own, so run
 * this once on deploy:
 *
 *     php artisan resources:secure-restricted
 *
 * Idempotent — a file already in the right place is left alone — so it is safe
 * to keep in the release script.
 */
class SecureRestrictedResources extends Command
{
    protected $signature = 'resources:secure-restricted {--dry-run : List what would move without moving it}';

    protected $description = 'Move view-only resource files off the public disk';

    public function handle(ResourceFileStore $store): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $resources = Resource::where('file_downloadable', false)
            ->where(function ($q) {
                $q->whereNull('file_disk')
                    ->orWhere('file_disk', '!=', ResourceFileStore::PRIVATE_DISK);
            })
            ->whereNotNull('file_url')
            ->get();

        if ($resources->isEmpty()) {
            $this->info('Nothing to do — every view-only file is already private.');

            return self::SUCCESS;
        }

        $moved = 0;

        foreach ($resources as $resource) {
            if ($dryRun) {
                $this->line("would secure: {$resource->slug}");
                $moved++;
                continue;
            }

            $changes = $store->reconcile($resource);

            if ($changes === []) {
                $this->warn("skipped (file missing): {$resource->slug}");
                continue;
            }

            $resource->forceFill($changes)->saveQuietly();
            $this->line("secured: {$resource->slug}");
            $moved++;
        }

        $this->info($dryRun
            ? "{$moved} file(s) would be moved."
            : "{$moved} file(s) moved off the public disk.");

        return self::SUCCESS;
    }
}
