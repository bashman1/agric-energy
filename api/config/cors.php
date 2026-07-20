<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Allow the Next.js frontend origin(s). Comma-separated FRONTEND_URLS in
    // .env, defaulting to the local dev server.
    'allowed_origins' => array_map(
        'trim',
        explode(',', env('FRONTEND_URLS', env('FRONTEND_URL', 'http://localhost:3000')))
    ),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Bearer-token auth is used from the Next.js server; enable credentials so
    // cookie-based Sanctum SPA auth also works if adopted later.
    'supports_credentials' => true,

];
