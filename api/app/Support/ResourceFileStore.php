<?php

namespace App\Support;

use App\Models\Resource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Keeps a resource's file on the disk its access setting implies.
 *
 * `file_downloadable` used to be presentation only — the file sat on the public
 * disk under a permanent /storage/... path whatever the setting said, so "view
 * online only" meant "the download button is hidden" and nothing more. Anyone
 * with the address, including the browser's own PDF viewer one click from
 * "Save", could take a copy.
 *
 * Now the setting decides where the bytes live:
 *
 *   downloadable  → public disk,  served directly by nginx as before
 *   view-only     → private disk, unreachable by URL, streamed only through a
 *                   short-lived signed route (see ResourceFileController)
 *
 * Toggling the setting moves the file between the two. Moves are best-effort:
 * a missing file leaves the record's metadata alone rather than throwing, since
 * an editor changing a checkbox should not hit a 500 because an upload was
 * cleaned up out from under it.
 */
class ResourceFileStore
{
    public const PUBLIC_DISK = 'public';
    public const PRIVATE_DISK = 'local';

    /** Where restricted files live within the private disk. */
    private const RESTRICTED_PREFIX = 'restricted';

    /**
     * Put the file where the current `file_downloadable` setting requires, and
     * return the attributes that need writing back (empty if nothing moved).
     */
    public function reconcile(Resource $resource): array
    {
        $restricted = $resource->file_downloadable === false;

        // Nothing attached: clear any stale bookkeeping.
        if (blank($resource->file_url) && blank($resource->file_path)) {
            return $resource->file_disk === null ? [] : [
                'file_disk' => null,
                'file_path' => null,
            ];
        }

        return $restricted
            ? $this->makeRestricted($resource)
            : $this->makePublic($resource);
    }

    /** Move onto the private disk and point file_url at the signed route. */
    private function makeRestricted(Resource $resource): array
    {
        if ($resource->file_disk === self::PRIVATE_DISK && filled($resource->file_path)) {
            // Already private; just make sure the URL still points at the route
            // (the slug can change when a record is renamed).
            $route = $this->routeUrl($resource);

            return $resource->file_url === $route ? [] : ['file_url' => $route];
        }

        $source = $this->publicPathFor($resource);

        if ($source === null || ! Storage::disk(self::PUBLIC_DISK)->exists($source)) {
            return [];
        }

        $target = self::RESTRICTED_PREFIX . '/' . basename($source);

        // A collision would overwrite someone else's file, so make room.
        if (Storage::disk(self::PRIVATE_DISK)->exists($target)) {
            $target = self::RESTRICTED_PREFIX . '/' . Str::random(8) . '-' . basename($source);
        }

        Storage::disk(self::PRIVATE_DISK)->put(
            $target,
            Storage::disk(self::PUBLIC_DISK)->get($source)
        );
        Storage::disk(self::PUBLIC_DISK)->delete($source);

        return [
            'file_disk' => self::PRIVATE_DISK,
            'file_path' => $target,
            'file_name' => $resource->file_name ?: basename($source),
            'file_url' => $this->routeUrl($resource),
        ];
    }

    /** Move back onto the public disk and restore a direct URL. */
    private function makePublic(Resource $resource): array
    {
        if ($resource->file_disk !== self::PRIVATE_DISK || blank($resource->file_path)) {
            return []; // already public, or never ours to move
        }

        $source = $resource->file_path;

        if (! Storage::disk(self::PRIVATE_DISK)->exists($source)) {
            return ['file_disk' => null, 'file_path' => null];
        }

        $target = 'uploads/documents/' . basename($source);

        Storage::disk(self::PUBLIC_DISK)->put(
            $target,
            Storage::disk(self::PRIVATE_DISK)->get($source)
        );
        Storage::disk(self::PRIVATE_DISK)->delete($source);

        return [
            'file_disk' => self::PUBLIC_DISK,
            'file_path' => $target,
            'file_url' => Storage::disk(self::PUBLIC_DISK)->url($target),
        ];
    }

    /**
     * The stored path inside the public disk, derived from the public URL.
     *
     * Uploads come back from MediaController as a full /storage/... URL and
     * that is what the forms round-trip, so the path has to be recovered from
     * it. Anything that is not one of our own /storage URLs (an external link
     * someone pasted in) returns null and is left alone.
     */
    private function publicPathFor(Resource $resource): ?string
    {
        if (filled($resource->file_path) && $resource->file_disk === self::PUBLIC_DISK) {
            return $resource->file_path;
        }

        $url = (string) $resource->file_url;

        if ($url === '') {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH) ?: $url;
        $marker = '/storage/';
        $at = strpos($path, $marker);

        return $at === false ? null : substr($path, $at + strlen($marker));
    }

    /** The API route a restricted file is fetched through. */
    private function routeUrl(Resource $resource): string
    {
        return url("/api/v1/resources/{$resource->slug}/file");
    }

    /**
     * A signed URL that streams the file, valid briefly.
     *
     * Short-lived so a link lifted from the page's network traffic stops
     * working rather than becoming a permanent public mirror of a file whose
     * owner asked for it not to circulate.
     */
    public function signedUrl(Resource $resource, int $minutes = 15): string
    {
        return URL::temporarySignedRoute(
            'resources.file',
            now()->addMinutes($minutes),
            ['slug' => $resource->slug]
        );
    }
}
