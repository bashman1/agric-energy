<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

/**
 * Read-only audit trail viewer for administrators. Surfaces the spatie
 * activity log (who did what, to which record, when).
 */
class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view-audit'); // super-admin and platform-admin

        $query = Activity::query()->with('causer')->latest();

        if ($request->filled('event')) {
            $query->where('event', $request->query('event'));
        }
        if ($request->filled('subjectType')) {
            $query->where('subject_type', 'like', '%' . $request->query('subjectType'));
        }

        $log = $query->limit((int) $request->query('limit', 100))->get();

        return response()->json([
            'data' => $log->map(fn (Activity $a) => [
                'id' => $a->id,
                'event' => $a->event,
                'description' => $a->description,
                'logName' => $a->log_name,
                'subjectType' => class_basename($a->subject_type ?? ''),
                'subjectId' => $a->subject_id,
                'causer' => $a->causer?->name,
                'changes' => $a->changes(),
                'at' => optional($a->created_at)->toISOString(),
            ]),
            'total' => $log->count(),
        ]);
    }
}
