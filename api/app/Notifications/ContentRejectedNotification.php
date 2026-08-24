<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an author their submission was returned, and carries the reviewer's
 * notes with it.
 *
 * Without this the loop stayed open: the record's status changed and the notes
 * were saved, but the only way to learn either was to go back to the portal and
 * look. A returned submission that nobody knows about is a submission that
 * never gets fixed.
 */
class ContentRejectedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Model $model,
        protected string $contentType,
        protected string $notes,
        protected ?string $actorName = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'content_rejected',
            'title' => "Changes requested: {$this->name()}",
            'contentType' => $this->contentType,
            'slug' => $this->model->slug,
            'notes' => $this->notes,
            'actor' => $this->actorName ?? 'Platform',
            'reviewedAt' => now()->toISOString(),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $this->name();

        return (new MailMessage)
            ->subject("Changes requested: {$name}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your submission **{$name}** has been reviewed and returned for changes.")
            ->line('Reviewer notes:')
            ->line($this->notes)
            ->action('Open your submissions', url('/partner'))
            ->line('Once you have made the changes, resubmit it and it will go back into the review queue.')
            ->line('Reviewed by: ' . ($this->actorName ?? 'the platform team'));
    }

    private function name(): string
    {
        return (string) ($this->model->title ?? $this->model->name ?? $this->model->slug);
    }
}
