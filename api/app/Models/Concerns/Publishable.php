<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Shared editorial-workflow behaviour for every publishable content entity
 * (projects, technologies, themes, partners, resources, events, …). Also wires
 * in spatie activity logging so every create/update/delete is audited.
 */
trait Publishable
{
    // Every publishable entity can also carry a pending edit to its live
    // version, so revisions ride along with the workflow rather than being
    // opted into model by model.
    use HasRevisions, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'name', 'slug', 'published', 'workflow_status', 'featured'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('content');
    }

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_REVIEW = 'in_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_ARCHIVED = 'archived';

    /** Author of the record (admin or partner contributor). */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Only records visible to the public. */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('published', true);
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('featured', true);
    }

    /** Awaiting reviewer/admin action. */
    public function scopePendingReview(Builder $query): Builder
    {
        return $query->whereIn('workflow_status', [
            self::STATUS_PENDING,
            self::STATUS_IN_REVIEW,
        ]);
    }
}
