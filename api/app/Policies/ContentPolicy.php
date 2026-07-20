<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Authorization for all publishable content entities (projects, technologies,
 * themes, partners, resources, events, opportunities, policies, posts).
 *
 * Roles:
 *  - super-admin : everything (granted in AppServiceProvider via Gate::before)
 *  - editor      : create/update/delete/publish any content
 *  - reviewer    : approve/reject submitted content
 *  - partner     : create content (enters review) and edit/delete OWN records
 *                  while not yet published
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
            && $user->hasAnyRole(['editor', 'reviewer', 'partner']);
    }

    public function update(User $user, Model $model): bool
    {
        if ($user->hasRole('editor')) {
            return true;
        }

        // Partners may edit their own content until it is published.
        return $this->owns($user, $model) && ! $model->published;
    }

    public function delete(User $user, Model $model): bool
    {
        if ($user->hasRole('editor')) {
            return true;
        }

        return $this->owns($user, $model) && ! $model->published;
    }

    /** Reviewers and editors move content through the workflow. */
    public function review(User $user, Model $model): bool
    {
        return $user->hasAnyRole(['reviewer', 'editor']);
    }

    /** Publishing is an editor-level action. */
    public function publish(User $user, Model $model): bool
    {
        return $user->hasRole('editor');
    }

    private function owns(User $user, Model $model): bool
    {
        return (int) $model->getAttribute('created_by') === (int) $user->id;
    }
}
