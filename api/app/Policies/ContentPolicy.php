<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Database\Eloquent\Model;

/**
 * Authorization for all publishable content entities (projects, technologies,
 * themes, partners, resources, events, opportunities, policies, posts).
 *
 * Roles (see App\Support\Roles):
 *  - super-admin         : everything (granted in AppServiceProvider via before)
 *  - platform-admin      : create/update/delete/publish/review any content
 *  - knowledge-manager   : create/update/delete/publish/review any content
 *  - content-contributor : create content (enters review) and edit/delete OWN
 *                          records while not yet published
 */
class ContentPolicy
{
    /** Anyone may browse; published-only filtering happens in the controller. */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Model $model): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isApproved()
            && $user->hasAnyRole(Roles::CONTENT_AUTHORS);
    }

    public function update(User $user, Model $model): bool
    {
        if ($user->hasAnyRole(Roles::CONTENT_MANAGERS)) {
            return true;
        }

        // Contributors may edit their own content until it is published.
        return $this->owns($user, $model) && ! $model->published;
    }

    public function delete(User $user, Model $model): bool
    {
        if ($user->hasAnyRole(Roles::CONTENT_MANAGERS)) {
            return true;
        }

        return $this->owns($user, $model) && ! $model->published;
    }

    /** Content managers move content through the review workflow. */
    public function review(User $user, Model $model): bool
    {
        return $user->hasAnyRole(Roles::CONTENT_MANAGERS);
    }

    /** Publishing is a content-manager action. */
    public function publish(User $user, Model $model): bool
    {
        return $user->hasAnyRole(Roles::CONTENT_MANAGERS);
    }

    private function owns(User $user, Model $model): bool
    {
        return (int) $model->getAttribute('created_by') === (int) $user->id;
    }
}
