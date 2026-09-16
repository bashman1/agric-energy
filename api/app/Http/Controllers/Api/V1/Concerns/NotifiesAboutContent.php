<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\Partner;
use App\Models\User;
use App\Notifications\ContentPublishedNotification;
use App\Notifications\ContentRejectedNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Notification;

/**
 * The "this record went live" / "this record was turned down" fan-outs,
 * shared by the one-at-a-time workflow transitions and the bulk actions.
 *
 * Extracted from WorkflowController when bulk publishing arrived: a bulk
 * publish is the same editorial event as approving a single record, so it
 * has to tell the same people. Re-implementing that would mean a record
 * published from the list notifies nobody while the identical record
 * published from the review queue notifies everyone — the kind of
 * difference nobody discovers until an author complains.
 *
 * Every method swallows its own failures. A mail or database problem must
 * never roll back an editorial decision that has already been recorded.
 */
trait NotifiesAboutContent
{
    /**
     * Tell the partners nominated on the record that it is live.
     */
    protected function notifyNominatedPartners(Model $model, string $type, ?string $actorName): void
    {
        try {
            $partnerSlugs = $model->getAttribute('notify_partner_ids') ?? [];
            // A project also names one partner by email address on the create
            // form. Kept separate because that address may belong to a partner
            // with no account, or to nobody on the platform at all.
            $partnerEmail = trim((string) $model->getAttribute('partner_email'));

            if (empty($partnerSlugs) && $partnerEmail === '') {
                return;
            }

            $notification = fn () => new ContentPublishedNotification($model, $type, $actorName);
            $notified = [];

            foreach (Partner::whereIn('slug', $partnerSlugs)->get() as $partner) {
                foreach (User::where('partner_id', $partner->id)->get() as $user) {
                    $user->notify($notification());
                    $notified[] = strtolower($user->email);
                }
            }

            // Only when no account at that address was reached above, so a
            // partner with a user does not get the mail twice.
            if ($partnerEmail !== '' && ! in_array(strtolower($partnerEmail), $notified, true)) {
                Notification::route('mail', $partnerEmail)->notify($notification());
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Tell the author what happened to their submission.
     *
     * A rejection previously reached nobody: the contributor found out by
     * going back to the portal and noticing the status, and the reviewer's
     * notes went unread. Both outcomes are notified now.
     */
    protected function notifyAuthor(Model $model, string $type, bool $published, ?string $notes, ?User $actor): void
    {
        try {
            $author = $model->author;

            if (! $author || ($actor && $author->id === $actor->id)) {
                return; // nobody to tell, or they just did it themselves
            }

            $author->notify($published
                ? new ContentPublishedNotification($model, $type, $actor?->name)
                : new ContentRejectedNotification($model, $type, $notes ?? '', $actor?->name));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
