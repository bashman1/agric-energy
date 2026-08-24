<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A proposed edit to an already-published record, waiting for review.
 *
 * See the create_content_revisions_table migration for why edits to live
 * records are parked rather than applied.
 */
class ContentRevision extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    /** Key inside `payload` holding many-to-many slug arrays. */
    public const RELATIONS_KEY = '__relations';

    protected $fillable = [
        'revisable_type',
        'revisable_id',
        'payload',
        'status',
        'created_by',
        'reviewed_by',
        'review_notes',
        'reviewed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function revisable(): MorphTo
    {
        return $this->morphTo();
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /** The proposed column values, without the relationship sidecar. */
    public function attributesPayload(): array
    {
        $payload = $this->payload ?? [];
        unset($payload[self::RELATIONS_KEY]);

        return $payload;
    }

    /** The proposed many-to-many slug arrays. */
    public function relationsPayload(): array
    {
        return $this->payload[self::RELATIONS_KEY] ?? [];
    }
}
