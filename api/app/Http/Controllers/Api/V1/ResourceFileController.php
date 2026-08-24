<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Resource;
use App\Support\ResourceFileStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves the file attached to a resource.
 *
 * Two entry points, because the two access settings genuinely differ:
 *
 *  - `link` hands the page a short-lived signed URL. It is public because the
 *    resource itself is public — what it does not hand over is a permanent
 *    address that can be shared, indexed or hotlinked.
 *  - `show` is that signed URL. It streams the bytes with an inline
 *    disposition so the browser renders them in place, and refuses to attach
 *    them as a download when the owner asked for view-only.
 *
 * A downloadable resource never comes through here at all: its file stays on
 * the public disk and the page links to it directly, exactly as before.
 */
class ResourceFileController extends Controller
{
    public function __construct(private readonly ResourceFileStore $store) {}

    /**
     * How this resource's file should be fetched.
     *
     * One call for both settings, so the page does not have to work out which
     * case it is in: a downloadable file comes back as its ordinary public URL
     * and is served by nginx as before, a restricted one as a signed URL that
     * expires.
     */
    public function link(string $slug): JsonResponse
    {
        $resource = Resource::where('slug', $slug)->where('published', true)->first();

        if (! $resource || blank($resource->file_url)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $downloadable = $resource->file_downloadable !== false;
        $expiresInMinutes = 15;

        return response()->json(['data' => [
            'url' => $downloadable
                ? $resource->file_url
                : $this->store->signedUrl($resource, $expiresInMinutes),
            'downloadable' => $downloadable,
            'name' => $resource->file_name ?: basename((string) $resource->file_path),
            'expiresAt' => $downloadable
                ? null
                : now()->addMinutes($expiresInMinutes)->toISOString(),
        ]]);
    }

    /**
     * Stream a restricted file, inline, through a valid signed link.
     *
     * Always inline and never as an attachment: the only files routed here are
     * the ones whose owner asked that copies not circulate. There is
     * deliberately no `?download=` escape hatch — a signature covers the query
     * string, so adding one invalidates the link rather than changing the
     * disposition, and a parameter that cannot be set is worse than none.
     */
    public function show(Request $request, string $slug): Response|StreamedResponse
    {
        $resource = Resource::where('slug', $slug)->where('published', true)->firstOrFail();

        $disk = $resource->file_disk ?: ResourceFileStore::PUBLIC_DISK;
        $path = $resource->file_path;

        if (blank($path) || ! Storage::disk($disk)->exists($path)) {
            abort(404, 'File not available.');
        }

        $name = $resource->file_name ?: basename($path);

        return Storage::disk($disk)->response($path, $name, [
            'Content-Disposition' => 'inline; filename="' . addslashes($name) . '"',
            // Must not linger in a shared cache, where it would outlive the
            // signature that authorised handing it over.
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
