<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\MyContentController;
use App\Http\Controllers\Api\V1\NewsletterController;
use App\Http\Controllers\Api\V1\OpenDataController;
use App\Http\Controllers\Api\V1\OpportunityController;
use App\Http\Controllers\Api\V1\PartnerController;
use App\Http\Controllers\Api\V1\PolicyController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ResourceController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\SiteConfigController;
use App\Http\Controllers\Api\V1\SubmissionController;
use App\Http\Controllers\Api\V1\TaxonomyController;
use App\Http\Controllers\Api\V1\TechnologyController;
use App\Http\Controllers\Api\V1\ThemeController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WorkflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ── Authentication ────────────────────────────────────────────────
    Route::post('auth/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1');
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1'); // basic brute-force protection
    Route::get('auth/verify-email/{id}/{hash}', EmailVerificationController::class)
        ->name('verification.verify')
        ->middleware(['signed', 'throttle:6,1']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        // Partner self-service: the caller's own submissions across types.
        Route::get('my/content', [MyContentController::class, 'index']);
        // Media/file uploads (staff or approved partner).
        Route::post('media', [MediaController::class, 'store'])
            ->middleware('throttle:30,1');
    });

    // ── Public read endpoints ─────────────────────────────────────────
    // Content entities: index (list/filter) + show (by slug).
    $readOnly = [
        'projects' => ProjectController::class,
        'technologies' => TechnologyController::class,
        'themes' => ThemeController::class,
        'partners' => PartnerController::class,
        'resources' => ResourceController::class,
        'events' => EventController::class,
        'opportunities' => OpportunityController::class,
        'policies' => PolicyController::class,
        'posts' => PostController::class,
    ];
    foreach ($readOnly as $slug => $controller) {
        Route::get($slug, [$controller, 'index']);
        Route::get("{$slug}/{slug}", [$controller, 'show']);
    }

    Route::get('taxonomy', [TaxonomyController::class, 'index']);
    Route::get('site-config', [SiteConfigController::class, 'show']);
    Route::get('search', [SearchController::class, 'index']);
    Route::get('search/suggest', [SearchController::class, 'suggest']);

    // Public open data (map aggregates + downloads).
    Route::get('open-data/regions', [OpenDataController::class, 'regions']);
    Route::get('open-data/projects.csv', [OpenDataController::class, 'projectsCsv']);
    Route::get('open-data/projects.geojson', [OpenDataController::class, 'projectsGeojson']);

    // Newsletter (public subscribe + signed confirm/unsubscribe).
    Route::post('newsletter/subscribe', [NewsletterController::class, 'subscribe'])
        ->middleware('throttle:5,1');
    Route::get('newsletter/confirm/{token}', [NewsletterController::class, 'confirm']);
    Route::get('newsletter/unsubscribe/{token}', [NewsletterController::class, 'unsubscribe']);

    // Public contact-form intake.
    Route::post('submissions', [SubmissionController::class, 'store']);

    // ── Authenticated write / admin endpoints ─────────────────────────
    Route::middleware('auth:sanctum')->group(function () use ($readOnly) {
        foreach ($readOnly as $slug => $controller) {
            Route::post($slug, [$controller, 'store']);
            Route::put("{$slug}/{slug}", [$controller, 'update']);
            Route::delete("{$slug}/{slug}", [$controller, 'destroy']);
        }

        Route::put('taxonomy', [TaxonomyController::class, 'update']);
        Route::put('site-config', [SiteConfigController::class, 'update']);

        Route::get('submissions', [SubmissionController::class, 'index']);
        Route::get('submissions/{id}', [SubmissionController::class, 'show']);
        Route::patch('submissions/{id}', [SubmissionController::class, 'update']);
        Route::delete('submissions/{id}', [SubmissionController::class, 'destroy']);

        // Admin account management (super-admin only, enforced in controller).
        Route::get('users', [UserController::class, 'index']);
        Route::post('users/{user}/approve', [UserController::class, 'approve']);
        Route::post('users/{user}/suspend', [UserController::class, 'suspend']);
        Route::put('users/{user}/roles', [UserController::class, 'setRoles']);

        // Analytics & reporting.
        Route::get('analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('analytics/export/{type}', [AnalyticsController::class, 'export']);

        // Newsletter subscriber management.
        Route::get('newsletter/subscribers', [NewsletterController::class, 'index']);
        Route::get('newsletter/export', [NewsletterController::class, 'export']);

        // Editorial workflow (review queue + transitions) and audit trail.
        Route::get('review/queue', [WorkflowController::class, 'queue']);
        Route::post('{type}/{slug}/submit', [WorkflowController::class, 'submit']);
        Route::post('{type}/{slug}/approve', [WorkflowController::class, 'approve']);
        Route::post('{type}/{slug}/reject', [WorkflowController::class, 'reject']);
        Route::get('audit', [AuditController::class, 'index']);
    });
});
