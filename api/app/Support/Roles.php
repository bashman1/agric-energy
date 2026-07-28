<?php

namespace App\Support;

/**
 * Canonical RBAC roles and the capability groups derived from them.
 *
 * The platform has four roles (spatie/laravel-permission, guard `web`):
 *
 *  - super-admin         : full control — system settings, security, backups,
 *                          audit logs, user/role management, approvals, and all
 *                          content. Bypasses every gate via Gate::before().
 *  - platform-admin      : day-to-day operations — users, organisations,
 *                          knowledge resources, events, opportunities,
 *                          dashboards and reports. May approve and publish
 *                          content, but NOT change core system settings.
 *  - knowledge-manager   : curate the knowledge repository — review and publish
 *                          content, organise categories, manage metadata/tags,
 *                          uphold quality standards. No user or system settings.
 *  - content-contributor : create and edit their OWN content and upload files,
 *                          submitting it for review. Cannot publish directly.
 *  - partner             : external organisation account (self-registers, links
 *                          to a Partner profile, uses the /partner portal).
 *                          Same content powers as a contributor — author own,
 *                          submit for review, no direct publish — but NOT staff:
 *                          they do not access the /admin panel.
 *
 * Groups below are the single source of truth for authorization decisions;
 * gates and the ContentPolicy reference these rather than inline slug lists.
 */
final class Roles
{
    public const SUPER_ADMIN = 'super-admin';
    public const PLATFORM_ADMIN = 'platform-admin';
    public const KNOWLEDGE_MANAGER = 'knowledge-manager';
    public const CONTENT_CONTRIBUTOR = 'content-contributor';
    public const PARTNER = 'partner';

    /** Every assignable role. */
    public const ALL = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
        self::KNOWLEDGE_MANAGER,
        self::CONTENT_CONTRIBUTOR,
        self::PARTNER,
    ];

    /**
     * Roles that manage content: edit ANY record, publish, run the review
     * queue, manage taxonomy, and view analytics/reports.
     */
    public const CONTENT_MANAGERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
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
        self::KNOWLEDGE_MANAGER,
        self::CONTENT_CONTRIBUTOR,
        self::PARTNER,
    ];

    /** Roles that manage user accounts and role assignment. */
    public const USER_MANAGERS = [
        self::SUPER_ADMIN,
        self::PLATFORM_ADMIN,
    ];
}
