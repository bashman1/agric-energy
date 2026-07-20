<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SiteConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Site configuration singleton, exposed in the prototype's camelCase shape
 * (hero, stats, featured*Ids arrays, contact + about fields).
 */
class SiteConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->present(SiteConfig::current())]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('manage', SiteConfig::class);

        $config = SiteConfig::current();
        $body = $request->all();
        $featured = $config->featured ?? [];

        foreach (['projects', 'technologies', 'themes', 'partners', 'resources'] as $type) {
            $key = 'featured' . ucfirst($type) . 'Ids';
            if (array_key_exists($key, $body)) {
                $featured[$type] = $body[$key];
            }
        }

        $config->fill([
            'hero' => $body['hero'] ?? $config->hero,
            'stats' => $body['stats'] ?? $config->stats,
            'featured' => $featured,
            'contact_email' => $body['contactEmail'] ?? $config->contact_email,
            'contact_phone' => $body['contactPhone'] ?? $config->contact_phone,
            'about_summary' => $body['aboutSummary'] ?? $config->about_summary,
        ])->save();

        return response()->json(['data' => $this->present($config->fresh())]);
    }

    private function present(SiteConfig $config): array
    {
        $featured = $config->featured ?? [];

        return [
            'hero' => $config->hero ?? new \stdClass,
            'stats' => $config->stats ?? new \stdClass,
            'featuredProjectIds' => $featured['projects'] ?? [],
            'featuredTechnologyIds' => $featured['technologies'] ?? [],
            'featuredThemeIds' => $featured['themes'] ?? [],
            'featuredPartnerIds' => $featured['partners'] ?? [],
            'featuredResourceIds' => $featured['resources'] ?? [],
            'contactEmail' => $config->contact_email ?? '',
            'contactPhone' => $config->contact_phone ?? '',
            'aboutSummary' => $config->about_summary ?? '',
        ];
    }
}
