<?php

namespace App\Models\Concerns;

use App\Models\ContentRevision;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Lets a publishable record carry pending edits that have not been reviewed.
 */
trait HasRevisions
{
    public function revisions(): MorphMany
    {
        return $this->morphMany(ContentRevision::class, 'revisable');
    }

    public function pendingRevision(): ?ContentRevision
    {
        return $this->revisions()->pending()->latest('id')->first();
    }
}
