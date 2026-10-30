<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an applicant their registration was turned down, and why.
 *
 * Mail only: a rejected account cannot sign in, so a portal notification
 * would sit in an inbox its owner can never open.
 */
class AccountRejectedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected string $notes,
        protected ?string $actorName = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Agri-Energy Desk registration')
            ->greeting("Hello {$notifiable->name},")
            ->line('Thank you for registering on the Agri-Energy Desk. Your application has been reviewed and was not approved.')
            ->line('Reviewer comments:')
            ->line($this->notes)
            ->line('If you believe this was a mistake, or can supply what was missing, reply to this email or contact the platform team.')
            ->line('Reviewed by: ' . ($this->actorName ?? 'the platform team'));
    }
}
