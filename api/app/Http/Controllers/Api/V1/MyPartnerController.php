<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PartnerResource;
use App\Models\Partner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The caller's own directory profile, for the partner portal.
 *
 * Registration captures an organisation's or an individual's profile once and
 * then had no way to change it: the only edit path was an administrator opening
 * the record in /admin/partners. That made NREP the custodian of information it
 * does not own, and guaranteed the directory would drift out of date — the
 * exact bottleneck self-registration exists to remove.
 *
 * This is deliberately separate from PUT /partners/{slug}: that route is the
 * platform-wide one and is reached by content managers. Here the record is
 * resolved from the caller's own partner_id and never from a slug they supply,
 * so there is no id to tamper with. Authorisation still runs through
 * ContentPolicy, and an edit to an already-published profile is parked as a
 * revision like any other — the live entry does not change without a review.
 */
class MyPartnerController extends Controller
{
    /** The profile this account represents. */
    public function show(Request $request): JsonResponse
    {
        $partner = $this->resolve($request);

        if (! $partner) {
            return $this->noProfile();
        }

        $partner->load(['technologies', 'themes', 'projects']);

        return response()->json(['data' => new PartnerResource($partner)]);
    }

    /** Update it, subject to review if it is already live. */
    public function update(Request $request): JsonResponse
    {
        $partner = $this->resolve($request);

        if (! $partner) {
            return $this->noProfile();
        }

        // Delegate to the content controller so the profile goes through the
        // same validation, revision routing and relationship syncing as any
        // other edit. Duplicating that here is how the two paths drift apart.
        return app(PartnerController::class)->update($request, $partner->slug);
    }

    private function resolve(Request $request): ?Partner
    {
        $partnerId = $request->user()?->partner_id;

        return $partnerId ? Partner::find($partnerId) : null;
    }

    private function noProfile(): JsonResponse
    {
        return response()->json([
            'error' => 'This account has no directory profile.',
        ], 404);
    }
}
