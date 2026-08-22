<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Model;
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

        return (new MailMessage)
            ->subject("New {$this->contentType}: {$name}")
            ->greeting("Hello {$notifiable->name},")
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
