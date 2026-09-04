<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * File & image uploads for content (featured images, logos, documents).
 * Stores on the public disk and returns a servable URL. Any authenticated,
 * approved contributor (staff or partner) may upload.
 */
class MediaController extends Controller
{
    /**
     * SVG is deliberately excluded. An SVG is executable markup: a crafted
     * one served from /storage runs script on the app's own origin, where
     * it can read the admin's Sanctum token out of sessionStorage. The
     * frontend is served by this same Laravel instance under the static
     * build, so there is no origin separation left to blunt that. Raster
     * formats only — logos should be uploaded as PNG or WebP.
     */
    private const IMAGE_MIMES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private const DOC_MIMES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt'];

    public function store(Request $request): JsonResponse
    {
        $this->authorize('upload-media');

        $kind = $request->input('kind', 'image'); // image | document
        $allowed = $kind === 'document' ? self::DOC_MIMES : self::IMAGE_MIMES;

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240', // 10 MB
                'mimes:' . implode(',', array_merge(self::IMAGE_MIMES, self::DOC_MIMES)),
            ],
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());

        if (! in_array($ext, $allowed, true)) {
            return response()->json([
                'error' => "This upload only accepts: " . implode(', ', $allowed),
            ], 422);
        }

        $folder = $kind === 'document' ? 'documents' : 'images';
        $name = Str::random(24) . '.' . $ext;
        $path = $file->storeAs("uploads/{$folder}", $name, 'public');

        return response()->json([
            'data' => [
                // ROOT-RELATIVE, deliberately. Storage::url() builds this from
                // APP_URL, which stamps one environment's hostname into a value
                // that is then saved to the database and served to everyone —
                // so an image uploaded on UAT came back as
                // http://localhost:8000/storage/... and rendered as a broken
                // image for every visitor. nginx puts the API, the frontend and
                // /storage on a single origin (see deploy/nginx/*.conf), so a
                // relative path is correct in every environment and survives a
                // domain change. `next dev` is the one split-origin case, and
                // the frontend re-attaches the origin there — see
                // UI/lib/utils/mediaUrl.ts.
                'url' => '/storage/' . ltrim($path, '/'),
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'kind' => $kind,
            ],
        ], 201);
    }
}
