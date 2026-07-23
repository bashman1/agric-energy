<?php

use App\Http\Controllers\StaticSiteController;
use Illuminate\Support\Facades\Route;

/*
| The exported Next.js frontend is served from public/static. This catch-all
| is last-resort: nginx answers these paths off disk in production and never
| reaches PHP. It exists so `php artisan serve` serves the whole app, and so
| the SPA fallback rule lives in exactly one place.
|
| The negative lookahead keeps API, uploaded media and the health check out
| of the frontend's hands — without it, /api/v1/projects would resolve to
| the SPA shell and return HTML where callers expect JSON.
*/
Route::get('/{path?}', StaticSiteController::class)
    ->where('path', '^(?!api/|storage/|up$).*$')
    ->name('spa');
