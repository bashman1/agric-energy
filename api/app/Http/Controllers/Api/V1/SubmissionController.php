<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubmissionResource;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Public contact-form intake (store) + admin inbox management (index/show/
 * update/destroy). Mirrors the prototype's submissions API.
 */
class SubmissionController extends Controller
{
    /** Public: create a contact/enquiry submission. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'submissionType' => 'nullable|string|max:50',
            'name' => 'required|string|max:255',
            'organisation' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $submission = Submission::create([
            'submission_type' => $data['submissionType'] ?? 'contact',
            'name' => $data['name'],
            'organisation' => $data['organisation'] ?? null,
            'email' => $data['email'],
            'subject' => $data['subject'] ?? null,
            'message' => $data['message'],
            'status' => 'new',
            'email_status' => 'not_sent',
            'submitted_at' => Carbon::now(),
        ]);

        // TODO (Phase F): dispatch admin notification mail here.

        return response()->json(['data' => new SubmissionResource($submission)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Submission::class);

        $query = Submission::query()->orderByDesc('submitted_at');
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        $items = $query->get();

        return response()->json([
            'data' => SubmissionResource::collection($items),
            'total' => $items->count(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $this->authorize('viewAny', Submission::class);
        $submission = Submission::findOrFail($id);

        return response()->json(['data' => new SubmissionResource($submission)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorize('viewAny', Submission::class);
        $submission = Submission::findOrFail($id);

        $data = $request->validate([
            'status' => 'nullable|in:new,read,responded,archived',
            'adminNotes' => 'nullable|string|max:5000',
        ]);

        $submission->update(array_filter([
            'status' => $data['status'] ?? null,
            'admin_notes' => $data['adminNotes'] ?? null,
        ], fn ($v) => $v !== null));

        return response()->json(['data' => new SubmissionResource($submission->fresh())]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->authorize('viewAny', Submission::class);
        Submission::findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
