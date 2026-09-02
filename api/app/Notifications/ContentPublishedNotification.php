<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ContentPublishedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Model $model,
        protected string $contentType,
        protected ?string $actorName = null,
    ) {}

    public function via(object $notifiable): array
    {
        // A project can name a partner by email address alone — see
        // ProjectController — and that address may belong to nobody with an
        // account. Such a recipient arrives as an AnonymousNotifiable, which
        // has no database channel to write an in-app notification to.
        if ($notifiable instanceof AnonymousNotifiable) {
            return ['mail'];
        }

        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'content_published',
            'title' => $this->buildTitle(),
            'contentType' => $this->contentType,
            'slug' => $this->model->slug,
            'actor' => $this->actorName ?? 'Platform',
            'publishedAt' => now()->toISOString(),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = (string) ($this->model->title ?? $this->model->name ?? $this->model->slug);
        $url = url("/{$this->contentType}/{$this->model->slug}");

        // AnonymousNotifiable carries an address and nothing else.
        $recipient = $notifiable->name ?? null;

        return (new MailMessage)
            ->subject("New {$this->contentType}: {$name}")
            ->greeting($recipient ? "Hello {$recipient}," : 'Hello,')
            ->line("A {$this->contentType} you are tracking has been published.")
            ->line("**{$name}**")
            ->action("View {$this->contentType}", $url)
            ->line("Published by: " . ($this->actorName ?? 'the platform team'));
    }

    private function buildTitle(): string
    {
        $name = (string) ($this->model->title ?? $this->model->name ?? $this->model->slug);

        return "{$this->contentType} published: {$name}";
    }
}
