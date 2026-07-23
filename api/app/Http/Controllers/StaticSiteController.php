<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves the exported Next.js frontend out of public/static.
 *
 * In production nginx resolves these paths off disk and never reaches PHP
 * (see deploy/nginx/*.conf); this controller is the fallback that keeps
 * `php artisan serve` and any non-nginx host working, and it is the single
 * place the SPA-fallback rule is defined.
 *
 * Resolution order for a request like /projects/solar-irrigation:
 *   1. public/static/projects/solar-irrigation/index.html  (prerendered page)
 *   2. public/static/projects/solar-irrigation.html
 *   3. public/static/projects/solar-irrigation             (a real asset)
 *   4. public/static/404.html                              (SPA fallback)
 *
 * Step 4 is what lets the client-rendered admin and partner areas own
 * routes that were never prerendered — /admin/projects/edit?slug=x works
 * because the shell boots and routes client-side.
 */
class StaticSiteController extends Controller
{
    public function __invoke(string $path = ''): Response
    {
        // Configurable so tests use a fixture directory rather than writing
        // over a real build (see config/frontend.php).
        $base = public_path(config('frontend.root', 'static'));

        if (! is_dir($base)) {
            abort(503, 'Frontend build missing — run deploy/scripts/build-ui.sh');
        }

        $clean = trim($path, '/');

        foreach ($this->candidates($clean) as $candidate) {
            $full = $this->safeJoin($base, $candidate);
            if ($full !== null && is_file($full)) {
                return $this->send($full);
            }
        }

        // SPA fallback. 404.html is Next's exported not-found page and also
        // boots the client router, so an un-prerendered route still renders.
        $fallback = $base . '/404.html';
        if (is_file($fallback)) {
            return response()->file($fallback, [
                'Cache-Control' => 'no-cache, must-revalidate',
            ])->setStatusCode(404);
        }

        abort(404);
    }

    /** @return list<string> */
    private function candidates(string $clean): array
    {
        if ($clean === '') {
            return ['index.html'];
        }

        return [
            "{$clean}/index.html",
            "{$clean}.html",
            $clean,
        ];
    }

    /**
     * Resolve a candidate inside the build root, refusing anything that
     * escapes it. `..` in a URL must never reach the filesystem.
     */
    private function safeJoin(string $base, string $candidate): ?string
    {
        $real = realpath($base . '/' . $candidate);
        if ($real === false) {
            return null;
        }

        $realBase = realpath($base);
        if ($realBase === false || ! str_starts_with($real, $realBase . DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $real;
    }

    private function send(string $full): BinaryFileResponse
    {
        // Hashed build assets are immutable; HTML must revalidate or a
        // deploy leaves stale pages pinned in browser caches.
        $immutable = str_contains($full, DIRECTORY_SEPARATOR . '_next' . DIRECTORY_SEPARATOR);
        $isHtml = str_ends_with($full, '.html');

        $cache = $immutable && ! $isHtml
            ? 'public, max-age=31536000, immutable'
            : 'no-cache, must-revalidate';

        return response()->file($full, ['Cache-Control' => $cache]);
    }
}
