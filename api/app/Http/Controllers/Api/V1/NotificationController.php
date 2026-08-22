<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $notifications = $user->notifications()
            ->orderByRaw('read_at IS NULL DESC')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? null,
                'title' => $n->data['title'] ?? null,
                'contentType' => $n->data['contentType'] ?? null,
                'slug' => $n->data['slug'] ?? null,
                'actor' => $n->data['actor'] ?? null,
                'publishedAt' => $n->data['publishedAt'] ?? null,
                'read' => $n->read_at !== null,
                'readAt' => optional($n->read_at)->toISOString(),
                'createdAt' => optional($n->created_at)->toISOString(),
            ])
            ->values();

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'data' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $notification = $user->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = Auth::user();
        $user->unreadNotifications->each->markAsRead();

        return response()->json(['message' => 'All marked as read']);
    }
}
