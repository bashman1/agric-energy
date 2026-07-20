<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Newsletter subscriptions with double opt-in confirmation and one-click
 * unsubscribe (both via unguessable tokens). Admin can list/export subscribers.
 */
class NewsletterController extends Controller
{
    /** Public: request a subscription (sends a confirmation link). */
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'name' => 'nullable|string|max:255',
        ]);

        $subscriber = Subscriber::firstOrNew(['email' => strtolower($data['email'])]);
        $subscriber->name = $data['name'] ?? $subscriber->name;
        if (! $subscriber->token) {
            $subscriber->token = Str::random(48);
        }
        // Re-subscribing clears a previous unsubscribe.
        $subscriber->unsubscribed_at = null;
        $subscriber->save();

        $this->sendConfirmation($subscriber);

        return response()->json([
            'message' => 'Almost done! Please check your email to confirm your subscription.',
        ], 202);
    }

    public function confirm(string $token): RedirectResponse
    {
        $frontend = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $subscriber = Subscriber::where('token', $token)->first();

        if (! $subscriber) {
            return redirect("{$frontend}/newsletter?status=invalid");
        }
        if (! $subscriber->confirmed_at) {
            $subscriber->update(['confirmed_at' => Carbon::now()]);
        }
        return redirect("{$frontend}/newsletter?status=confirmed");
    }

    public function unsubscribe(string $token): RedirectResponse
    {
        $frontend = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $subscriber = Subscriber::where('token', $token)->first();

        if ($subscriber) {
            $subscriber->update(['unsubscribed_at' => Carbon::now()]);
        }
        return redirect("{$frontend}/newsletter?status=unsubscribed");
    }

    /** Admin: list subscribers. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny');

        $subscribers = Subscriber::query()->latest()->get()->map(fn (Subscriber $s) => [
            'id' => $s->id,
            'email' => $s->email,
            'name' => $s->name,
            'status' => $s->unsubscribed_at ? 'unsubscribed' : ($s->confirmed_at ? 'confirmed' : 'pending'),
            'subscribedAt' => optional($s->created_at)->toISOString(),
        ]);

        return response()->json([
            'data' => $subscribers,
            'total' => $subscribers->count(),
            'active' => Subscriber::whereNotNull('confirmed_at')->whereNull('unsubscribed_at')->count(),
        ]);
    }

    /** Admin: export confirmed, active subscribers as CSV. */
    public function export(): StreamedResponse
    {
        $this->authorize('viewAny');

        $rows = Subscriber::whereNotNull('confirmed_at')->whereNull('unsubscribed_at')->get();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Email', 'Name', 'Confirmed At']);
            foreach ($rows as $s) {
                fputcsv($out, [$s->email, $s->name, optional($s->confirmed_at)->toDateTimeString()]);
            }
            fclose($out);
        }, 'agri-energy-subscribers-' . now()->format('Ymd') . '.csv', ['Content-Type' => 'text/csv']);
    }

    private function sendConfirmation(Subscriber $subscriber): void
    {
        $base = rtrim(config('app.url'), '/');
        $confirmUrl = "{$base}/api/v1/newsletter/confirm/{$subscriber->token}";

        try {
            Mail::raw(
                "Thank you for subscribing to the Agri-Energy Desk newsletter.\n\n"
                . "Please confirm your subscription by visiting:\n{$confirmUrl}\n\n"
                . "If you did not request this, you can ignore this email.",
                function ($message) use ($subscriber) {
                    $message->to($subscriber->email)
                        ->subject('Confirm your Agri-Energy Desk subscription');
                }
            );
        } catch (\Throwable $e) {
            report($e); // never fail the request on mail issues
        }
    }
}
