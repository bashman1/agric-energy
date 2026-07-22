<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Partner extends Model
{
    use Publishable;

    protected $guarded = ['id'];

    protected $casts = [
        'regions' => 'array',
        'district_coverage' => 'array',
        'coverage_scope' => 'array',
        'countries' => 'array',
        'sectors' => 'array',
        'value_chains' => 'array',
        'expertise' => 'array',
        'featured' => 'boolean',
        'published' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class)->withPivot('role');
    }

    public function technologies(): BelongsToMany
    {
        return $this->belongsToMany(Technology::class);
    }

    public function themes(): BelongsToMany
    {
        return $this->belongsToMany(Theme::class);
    }
}
