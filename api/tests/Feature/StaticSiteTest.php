<?php

namespace Tests\Feature;

use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

/**
 * The catch-all that serves the exported Next.js frontend from
 * public/static. nginx handles these paths in production; this is the
 * fallback path (artisan serve) and the one place the SPA rule lives.
 *
 * Responses are BinaryFileResponse, which has no buffered body, so these
 * assert on the resolved file rather than on rendered content.
 */
class StaticSiteTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        // A fixture directory, never public/static — these tests write files,
        // and pointing them at the real export would overwrite a live build.
        config(['frontend.root' => 'static-test']);
        $this->root = public_path('static-test');

        foreach (['projects/solar', '_next/static'] as $dir) {
            @mkdir("{$this->root}/{$dir}", 0777, true);
        }
        file_put_contents("{$this->root}/index.html", '<html>home</html>');
        file_put_contents("{$this->root}/projects/solar/index.html", '<html>solar</html>');
        file_put_contents("{$this->root}/404.html", '<html>notfound</html>');
        file_put_contents("{$this->root}/_next/static/app.css", 'body{}');
    }

    protected function tearDown(): void
    {
        // Leave no fixture behind in public/ — it is web-servable.
        exec('rm -rf ' . escapeshellarg($this->root));
        parent::tearDown();
    }

    /** The path of the file the controller decided to serve. */
    private function servedFile(TestResponse $response): string
    {
        $base = $response->baseResponse;
        $this->assertInstanceOf(BinaryFileResponse::class, $base);

        return str_replace($this->root . '/', '', $base->getFile()->getPathname());
    }

    public function test_it_serves_prerendered_pages_at_clean_urls(): void
    {
        $this->assertSame('index.html', $this->servedFile($this->get('/')->assertOk()));

        // With and without the trailing slash — Next exports directory-style.
        $this->assertSame(
            'projects/solar/index.html',
            $this->servedFile($this->get('/projects/solar')->assertOk())
        );
        $this->assertSame(
            'projects/solar/index.html',
            $this->servedFile($this->get('/projects/solar/')->assertOk())
        );
    }

    public function test_unprerendered_route_falls_back_to_the_spa_shell(): void
    {
        // Deep links that were never exported — an old-style per-record admin
        // URL, say — must still serve the shell so the client router can boot,
        // rather than dead-ending on a hard 404.
        $response = $this->get('/admin/projects/record-created-after-the-build')
            ->assertNotFound();

        $this->assertSame('404.html', $this->servedFile($response));
    }

    public function test_api_media_and_health_are_not_swallowed_by_the_catch_all(): void
    {
        // Without the negative lookahead these return the SPA shell as HTML.
        $this->getJson('/api/v1/site-config')->assertOk()
            ->assertHeader('Content-Type', 'application/json');
        $this->get('/up')->assertOk();
    }

    public function test_hashed_assets_are_immutable_but_html_revalidates(): void
    {
        // Symfony alphabetises Cache-Control directives.
        $this->get('/_next/static/app.css')->assertOk()
            ->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');

        // A deploy must not leave stale pages pinned in browser caches.
        $this->get('/')->assertOk()
            ->assertHeader('Cache-Control', 'must-revalidate, no-cache, public');
    }

    /**
     * A deploy that forgets the frontend build must fail loudly. Silently
     * 404ing every page would look like a routing bug for hours.
     */
    public function test_a_missing_build_returns_a_diagnosable_error(): void
    {
        $moved = $this->root . '.moved';
        rename($this->root, $moved);

        try {
            $this->get('/')->assertStatus(503);
        } finally {
            rename($moved, $this->root);
        }
    }

    public function test_path_traversal_is_refused(): void
    {
        $this->get('/../.env')->assertNotFound();
        $this->get('/%2e%2e/%2e%2e/.env')->assertNotFound();
        $this->get('/projects/../../.env')->assertNotFound();
    }
}
