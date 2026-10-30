<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells an applicant their registration was approved and they can sign in.
 * Without it the only way to find out was to keep trying the login page.
 */
class AccountApprovedNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Agri-Energy Desk account is approved')
            ->greeting("Hello {$notifiable->name},")
            ->line('Your registration on the Agri-Energy Desk has been approved. You can now sign in.')
            ->action('Sign in', url('/partner/login'));
    }
}
