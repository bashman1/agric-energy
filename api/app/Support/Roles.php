<?php

namespace App\Support;

/**
 * Canonical RBAC roles and the capability groups derived from them.
 *
 * The platform-level roles (spatie/laravel-permission, guard `web`):
 *
 *  - super-admin         : full control — system settings, security, backups,
 *                          audit logs, user/role management, approvals, and all
 *                          content. Bypasses every gate via Gate::before().
 *  - platform-admin      : everything a super-admin can do EXCEPT system
 *                          configuration (SYSTEM_ABILITIES) — Gate::before()
 *                          lets it through every other gate, the audit trail
 *                          included. It never sees or touches a super-admin
 *                          account, which would be a way round that exception.
 *  - organisation-admin  : day-to-day operations — users, organisations,
 *                          knowledge resources, events, opportunities,
 *                          dashboards and reports. May approve and publish
 *                          content, but has no audit trail, no system settings,
 *                          and cannot hand out an administrator role. NREP
 *                          staff; not to be confused with `partner-admin`,
 *                          which administers one external organisation.
 *  - knowledge-manager   : curate the knowledge repository — review and publish
 *                          content, organise categories, manage metadata/tags,
 *                          uphold quality standards. No user or system settings.
 *  - content-contributor : create and edit their OWN content and upload files,
 *                          submitting it for review. Cannot publish directly.
 *  - reviewer            : reads submitted content and approves it or returns it
 *                          with comments. Deliberately NOT a content author —
 *                          holding no authoring rights is what makes the check
 *                          independent, so `reviewer` is absent from
 *                          CONTENT_AUTHORS and from CONTENT_MANAGERS (which
 *                          carries authoring and taxonomy powers) and appears
 *                          only in REVIEWERS.
 *  - partner             : external organisation account (self-registers, links
 *                          to a Partner profile, uses the /partner portal).
 *                          Same content powers as a contributor — author own,
 *                          submit for review, no direct publish — but NOT staff:
 *                          they do not access the /admin panel.
 *
 * Plus three ORGANISATION-SCOPED roles, held by partner accounts and never
 * by staff. They exist so an organisation can run its own team without any
 * of them gaining power over the platform:
 *
 *  - partner-admin       : administrator OF ONE ORGANISATION. Granted to the
 *                          account that registers an organisation. May create
 *                          and manage other accounts belonging to the SAME
 *                          partner (see PartnerTeamController, which scopes
 *                          every query by the caller's partner_id).
 *  - partner-knowledge-manager,
 *  - partner-content-contributor
 *                        : an organisation's own knowledge/content people.
 *
 * These deliberately do NOT reuse the `knowledge-manager` and
 * `content-contributor` slugs. Those are platform-wide: they sit in
 * CONTENT_MANAGERS/STAFF and carry site-wide publishing and the review
 * queue. If a partner admin could grant them, any external organisation
 * could mint an account that publishes to the national platform. The
 * partner-scoped roles are content AUTHORS only — submit for review, never
 * publish, no /admin access.
 *
 * Groups below are the single source of truth for authorization decisions;
 * gates and the ContentPolicy reference these rather than inline slug lists.
 */
final class Roles
{
    public const SUPER_ADMIN = 'super-admin';
    public const PLATFORM_ADMIN = 'platform-admin';
    public const ORGANISATION_ADMIN = 'organisation-admin';
    public const KNOWLEDGE_MANAGER = 'knowledge-manager';
    public const CONTENT_CONTRIBUTOR = 'content-contributor';
    public const REVIEWER = 'reviewer';
    public const PARTNER = 'partner';

    // Organisation-scoped. Held by partner accounts only — see the class
    // docblock for why these are separate slugs and not the staff ones.
    public const PARTNER_ADMIN = 'partner-admin';
    public const PARTNER_KNOWLEDGE_MANAGER = 'partner-knowledge-manager';
    public const PARTNER_CONTENT_CONTRIBUTOR = 'partner-content-contributor';

    /** Every assignable role. */
    public const ALL = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
        self::KNOWLEDGE_MANAGER,
        self::CONTENT_CONTRIBUTOR,
        self::REVIEWER,
        self::PARTNER,
        self::PARTNER_ADMIN,
        self::PARTNER_KNOWLEDGE_MANAGER,
        self::PARTNER_CONTENT_CONTRIBUTOR,
    ];

    /**
     * Roles a partner administrator may grant inside their own organisation.
     * Every entry must be organisation-scoped — adding a staff role here is
     * a privilege-escalation hole, since the grantee would gain platform-wide
     * powers from an external account.
     */
    public const PARTNER_TEAM_ROLES = [
        self::PARTNER_ADMIN,
        self::PARTNER_KNOWLEDGE_MANAGER,
        self::PARTNER_CONTENT_CONTRIBUTOR,
    ];

    /** Every organisation-scoped role, including the plain partner account. */
    public const PARTNER_ROLES = [
        self::PARTNER,
        self::PARTNER_ADMIN,
        self::PARTNER_KNOWLEDGE_MANAGER,
        self::PARTNER_CONTENT_CONTRIBUTOR,
    ];

    /**
     * Roles that manage content: edit ANY record, publish, run the review
     * queue, manage taxonomy, and view analytics/reports.
     */
    public const CONTENT_MANAGERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
        self::KNOWLEDGE_MANAGER,
    ];

    /**
     * Roles that author content: create records and upload media. Contributors
     * and partners belong here but may only edit their own, still-unpublished
     * records (and their content enters review rather than publishing).
     */
    public const CONTENT_AUTHORS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
        self::KNOWLEDGE_MANAGER,
        self::CONTENT_CONTRIBUTOR,
        self::PARTNER,
        self::PARTNER_ADMIN,
        self::PARTNER_KNOWLEDGE_MANAGER,
        self::PARTNER_CONTENT_CONTRIBUTOR,
    ];

    /** Roles that manage user accounts and role assignment. */
    public const USER_MANAGERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
    ];

    /**
     * The administrator tiers, highest first. An administrator never sees or
     * acts on an account in a tier above their own (see outranking()), and
     * only the top two may change who holds one (UserController::assertMayGrant).
     */
    public const ADMIN_TIERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
    ];

    /**
     * Abilities that stay with the super-admin alone. A platform-admin passes
     * every other gate through Gate::before().
     */
    public const SYSTEM_ABILITIES = ['manage-settings'];

    /**
     * The administrator roles above the highest tier found in $roles — all of
     * them for an account that holds none.
     *
     * @param  string[]  $roles
     * @return string[]
     */
    public static function outranking(array $roles): array
    {
        foreach (self::ADMIN_TIERS as $i => $tier) {
            if (in_array($tier, $roles, true)) {
                return array_slice(self::ADMIN_TIERS, 0, $i);
            }
        }

        return self::ADMIN_TIERS;
    }

    /**
     * Roles that may work the review queue: approve a submission or return it
     * with comments. CONTENT_MANAGERS are here because they already publish
     * directly; `reviewer` is here and nowhere else, which is the whole point
     * of the role — it reviews without ever being able to author.
     *
     * Holding a role here does not by itself let you approve ANY record:
     * ContentPolicy::review() additionally refuses to let an author sign off
     * their own work, so a second person is always involved.
     */
    public const REVIEWERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::ORGANISATION_ADMIN,
        self::KNOWLEDGE_MANAGER,
        self::REVIEWER,
    ];

    /**
     * Roles that sign off their OWN organisation's submissions before NREP is
     * asked to review them.
     *
     * The knowledge manager belongs here for the same reason the platform's
     * knowledge-manager sits in REVIEWERS: checking a colleague's work is the
     * editorial half of the role, and confining it to the administrator meant
     * an organisation whose admin was away, or who authored the submission
     * themselves, had nobody who could move it on. The separation-of-duties
     * rule still holds — ContentPolicy::approveForOrg refuses the author
     * whatever role they hold — so widening the group cannot let anyone
     * endorse their own work.
     *
     * The content contributor is deliberately absent: they author, and a queue
     * where every member can clear their colleague's work in a ring is not a
     * review.
     */
    public const ORG_REVIEWERS = [
        self::PARTNER_ADMIN,
        self::PARTNER_KNOWLEDGE_MANAGER,
    ];
}
