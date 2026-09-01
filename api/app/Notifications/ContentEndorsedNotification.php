<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an author their organisation's administrator has endorsed their
 * submission and passed it to the platform.
 *
 * Separate from ContentPublishedNotification on purpose. The record has
 * cleared the first of two gates and is not public yet; announcing it as
 * published would have the author linking colleagues to a page that does not
 * exist, and stop them chasing the review that is still outstanding.
 */
class ContentEndorsedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Model $model,
        protected string $contentType,
        protected ?string $actorName = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'content_endorsed',
            'title' => "Sent for platform review: {$this->name()}",
            'contentType' => $this->contentType,
            'slug' => $this->model->slug,
            'actor' => $this->actorName ?? 'Your organisation',
            'endorsedAt' => now()->toISOString(),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $this->name();

        return (new MailMessage)
            ->subject("Sent for platform review: {$name}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your submission **{$name}** has been approved by your organisation and sent to the NREP review team.")
            ->line('It is not published yet — an NREP reviewer still has to approve it before it appears on the public site.')
            ->action('Track your submissions', url('/partner'))
            ->line('Approved by: ' . ($this->actorName ?? 'your organisation administrator'));
    }

    private function name(): string
    {
        return (string) ($this->model->title ?? $this->model->name ?? $this->model->slug);
    }
}
