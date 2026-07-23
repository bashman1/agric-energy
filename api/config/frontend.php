<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Exported frontend directory
    |--------------------------------------------------------------------------
    |
    | Path, relative to public/, holding the Next.js static export installed
    | by deploy/scripts/build-ui.sh. Configurable so the test suite can point
    | at a fixture directory instead of overwriting a real build.
    |
    | Changing this also means changing `assetPrefix` in UI/next.config.ts and
    | the /static/_next/ location block in the nginx vhost.
    |
    */

    'root' => env('FRONTEND_STATIC_DIR', 'static'),

];
