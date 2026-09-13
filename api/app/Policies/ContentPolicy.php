<?php

namespace App\Policies;

use App\Models\Partner;
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
 *  - reviewer            : review only — approve or return submissions. Cannot
 *                          create, edit or delete anything, which is what makes
 *                          the check independent of the people who author.
 *  - content-contributor : create content (enters review) and edit/delete OWN
 *                          records. An edit to an already-published record is
 *                          held as a pending revision rather than applied in
 *                          place (see ContentController::update), so the live
 *                          version never changes without a review.
 *  - partner-*           : as content-contributor, but "own" means the whole
 *                          organisation's records, not just the ones this
 *                          account happened to create.
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

        // An account may maintain the directory profile it registered, which
        // is the whole point of self-registration: the entry on the public
        // site is the registrant's to keep current, not something NREP
        // re-types on their behalf. Same review rules as any other edit.
        if ($this->isOwnDirectoryProfile($user, $model)) {
            return $user->isApproved();
        }

        // Contributors may edit their own content at any time, published or
        // not. What changes after publication is where the edit lands, not
        // whether it is allowed: ContentController::update routes it into a
        // pending revision instead of writing over the live record.
        return $user->isApproved() && $this->owns($user, $model);
    }

    public function delete(User $user, Model $model): bool
    {
        if ($user->hasAnyRole(Roles::CONTENT_MANAGERS)) {
            return true;
        }

        // Deletion still stops at publication — removing a live record is not
        // something a contributor should be able to do without a reviewer.
        return $user->isApproved() && $this->owns($user, $model) && ! $model->published;
    }

    /**
     * Content managers and reviewers move content through the review queue.
     *
     * An author may never approve their own submission, whatever else they
     * hold. This is the "second pair of eyes" rule: without it, a knowledge
     * manager could write a record and sign it off unaided, and the review
     * queue would be a formality. Super-admins bypass this via Gate::before(),
     * deliberately — someone has to be able to unblock a stuck queue.
     */
    public function review(User $user, Model $model): bool
    {
        if (! $user->hasAnyRole(Roles::REVIEWERS)) {
            return false;
        }

        return ! $this->authored($user, $model);
    }

    /**
     * An organisation's administrator signing off their own organisation's
     * submission, before the platform is asked to review it.
     *
     * Three conditions, all load-bearing:
     *
     *  - the record must actually be waiting at `org_pending`. An admin has
     *    no second bite once the platform has it, and none at all at a live
     *    record — edits to those queue as revisions;
     *  - the record must have been authored inside the admin's OWN
     *    organisation. Never anyone else's;
     *  - the admin must not be the author. Same "second pair of eyes" rule
     *    as review(): an organisation vouching for a submission means
     *    somebody other than its writer looked at it. ContentController
     *    keeps an admin's own work out of this stage entirely, so this
     *    catches the case where the role was granted after the fact.
     */
    public function approveForOrg(User $user, Model $model): bool
    {
        if (! $user->isApproved()
            || ! $user->hasAnyRole(Roles::ORG_REVIEWERS)
            || $user->partner_id === null) {
            return false;
        }

        if ($model->getAttribute('workflow_status') !== $model::STATUS_ORG_PENDING) {
            return false;
        }

        if ($this->authored($user, $model)) {
            return false;
        }

        return User::whereKey($model->getAttribute('created_by'))
            ->where('partner_id', $user->partner_id)
            ->exists();
    }

    /** Publishing is a content-manager action. */
    public function publish(User $user, Model $model): bool
    {
        return $user->hasAnyRole(Roles::CONTENT_MANAGERS);
    }

    /**
     * Whether this account may act on the record as its owner.
     *
     * For a partner account this is deliberately wider than "I created it":
     * an organisation's records belong to the organisation, so anyone holding
     * an organisation-scoped role can maintain them. Without this, a colleague
     * on leave takes their submissions with them.
     */
    private function owns(User $user, Model $model): bool
    {
        if ($this->authored($user, $model)) {
            return true;
        }

        return $user->partner_id !== null
            && $user->hasAnyRole(Roles::PARTNER_TEAM_ROLES)
            && (int) $model->getAttribute('created_by') !== 0
            && User::whereKey($model->getAttribute('created_by'))
                ->where('partner_id', $user->partner_id)
                ->exists();
    }

    /**
     * The Partner record this account registered and represents.
     *
     * Restricted to the organisation's administrator and to individuals
     * (whose profile is their own): a content contributor inside an
     * organisation authors that organisation's content, but the organisation's
     * public identity is not theirs to rewrite.
     */
    private function isOwnDirectoryProfile(User $user, Model $model): bool
    {
        return $model instanceof Partner
            && $user->partner_id !== null
            && (int) $model->getKey() === (int) $user->partner_id
            && $user->hasAnyRole([Roles::PARTNER_ADMIN, Roles::PARTNER]);
    }

    /** Strictly "this account created the record". */
    private function authored(User $user, Model $model): bool
    {
        $createdBy = $model->getAttribute('created_by');

        return $createdBy !== null && (int) $createdBy === (int) $user->id;
    }
}
