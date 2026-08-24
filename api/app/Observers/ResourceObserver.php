<?php

namespace App\Observers;

use App\Models\Resource;
use App\Support\ResourceFileStore;

/**
 * Keeps a resource's file on the disk its access setting implies.
 *
 * A model observer rather than a controller hook on purpose: the setting can
 * change through the admin form, a partner submission, or the approval of a
 * pending revision, and all three end at the same `save()`. Hooking the
 * controller would have covered the first two and quietly missed the third,
 * leaving an approved "view online only" edit with its file still public.
 */
class ResourceObserver
{
    /** Guards against the write-back below re-entering this observer. */
    private static bool $reconciling = false;

    public function saved(Resource $resource): void
    {
        if (self::$reconciling) {
            return;
        }

        // Only when something that decides file placement actually moved.
        if (! $resource->wasChanged(['file_url', 'file_downloadable', 'slug'])
            && $resource->wasRecentlyCreated === false) {
            return;
        }

        $changes = app(ResourceFileStore::class)->reconcile($resource);

        if ($changes === []) {
            return;
        }

        self::$reconciling = true;

        try {
            // Quietly: this is bookkeeping that follows from an edit already
            // made, not a second editorial change to log or re-observe.
            $resource->forceFill($changes)->saveQuietly();
        } finally {
            self::$reconciling = false;
        }
    }
}
