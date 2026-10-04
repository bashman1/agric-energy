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
 *   1. public/static/projects/solar-irrigation/index.html  (a real file)
 *   2. public/static/projects/solar-irrigation.html
 *   3. public/static/projects/solar-irrigation             (a real asset)
 *   4. public/static/projects/_entry/index.html            (collection shell, 200)
 *   5. public/static/404.html                              (SPA fallback, 404)
 *
 * Step 4 is what makes the export live rather than a snapshot. Each dynamic
 * route exports ONE shell (see UI/lib/routing/shell.ts) which reads the slug
 * from the address and fetches the record at runtime, so a project approved
 * a minute ago is served straight away, with a 200, from a build that
 * predates it. Without this the export could only serve slugs that existed
 * when it was built, and an approval stayed invisible until someone rebuilt.
 *
 * The distinction between 4 and 5 matters: a real record must not be served
 * under a 404, or search engines refuse to index it and caches decline to
 * store it. Step 5 stays a genuine 404 for paths under no known collection.
 */
class StaticSiteController extends Controller
{
    /**
     * Path segments that own a dynamic child route, mapped to their shell.
     *
     * Kept explicit rather than inferred from the filesystem: a wildcard
     * would answer 200 for any nonsense path under any directory, and the
     * site would never legitimately 404 again.
     */
    private const COLLECTIONS = [
        'projects', 'technologies', 'themes', 'partners',
        'resources', 'events', 'opportunities', 'news',
    ];

    /** Directory name of the exported shell — mirrors SHELL_SLUG in shell.ts. */
    private const SHELL = '_entry';

    public function __invoke(string $path = ''): Response
    {
        // Configurable so tests use a fixture directory rather than writing
        // over a real build (see config/frontend.php).
        $base = public_path(config('frontend.root', 'static'));

        if (! is_dir($base)) {
            abort(503, 'Frontend build missing — run deploy/scripts/build-ui.sh');
        }

        $clean = trim($path, '/');

        // The shell is a build artefact reachable at a real path on disk, so
        // without this it would serve as a page — one that waits forever for
        // a record called "_entry". Refuse it before the file lookup.
        if ($this->isShellPath($clean)) {
            abort(404);
        }

        foreach ($this->candidates($clean) as $candidate) {
            $full = $this->safeJoin($base, $candidate);
            if ($full !== null && is_file($full)) {
                return $this->send($full);
            }
        }

        // A record inside a known collection: serve that collection's shell,
        // which resolves the slug from the URL and fetches it live. 200,
        // because this is a real page — whether the record exists is the
        // API's answer to give, not something the build could have known.
        $shell = $this->shellFor($base, $clean);
        if ($shell !== null) {
            return response()->file($shell, [
                // The shell is identical for every record in the collection
                // and changes only when the site is rebuilt, so it must not
                // be held by a cache that would then serve a stale bundle.
                'Cache-Control' => 'no-cache, must-revalidate',
            ]);
        }

        // SPA fallback. 404.html is Next's exported not-found page and also
        // boots the client router, so an un-prerendered route still renders.
        //
        // Sent as a plain response, NOT response()->file(): Symfony's
        // BinaryFileResponse skips the body for any non-2xx status but still
        // sends the file's Content-Length, so the browser was promised ~14 KB
        // and received nothing. Over HTTP/2 that surfaced as a reset stream
        // (curl: INTERNAL_ERROR), over HTTP/1.1 as a truncated response.
        $fallback = $base . '/404.html';
        if (is_file($fallback)) {
            return response(file_get_contents($fallback), 404, [
                'Content-Type' => 'text/html; charset=utf-8',
                'Cache-Control' => 'no-cache, must-revalidate',
            ]);
        }

        abort(404);
    }

    /** Whether this path is the exported shell rather than a page. */
    private function isShellPath(string $clean): bool
    {
        $segments = explode('/', $clean);

        return count($segments) === 2
            && $segments[1] === self::SHELL
            && in_array($segments[0], self::COLLECTIONS, true);
    }

    /**
     * The exported shell for the collection this path belongs to, if any.
     *
     * Only ever one level deep: /projects/some-slug has a shell,
     * /projects/some-slug/extra does not. A detail page owns exactly one
     * segment, so anything deeper is a wrong URL and should say so.
     */
    private function shellFor(string $base, string $clean): ?string
    {
        if ($clean === '') {
            return null;
        }

        $segments = explode('/', $clean);

        if (count($segments) !== 2 || ! in_array($segments[0], self::COLLECTIONS, true)) {
            return null;
        }

        // Never hand the shell back for the sentinel itself — that path is a
        // build artefact, not a page anyone should land on.
        if ($segments[1] === self::SHELL) {
            return null;
        }

        $shell = $this->safeJoin($base, $segments[0] . '/' . self::SHELL . '/index.html');

        return $shell !== null && is_file($shell) ? $shell : null;
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
        $immutable = str_contains($full, DIRECTORY_SEPARATOR . '_next' . DIRECTORY_SEPARATOR);
        $isHtml = str_ends_with($full, '.html');

        $cache = $immutable && ! $isHtml
            ? 'public, max-age=31536000, immutable'
            : 'no-cache, must-revalidate';

        $headers = ['Cache-Control' => $cache];

        $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'css' => 'text/css',
            'js', 'mjs' => 'application/javascript',
            'json' => 'application/json',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject',
            'map' => 'application/json',
            default => null,
        };

        if ($mime) {
            $headers['Content-Type'] = $mime;
        }

        return response()->file($full, $headers);
    }
}
