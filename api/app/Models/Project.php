<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    use Publishable;

    protected $guarded = ['id'];

    protected $casts = [
        'regions' => 'array',
        'districts' => 'array',
        'beneficiaries' => 'array',
        'gallery' => 'array',
        'lat' => 'float',
        'lng' => 'float',
        'budget' => 'float',
        'beneficiary_count' => 'integer',
        'featured' => 'boolean',
        'published' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function technologies(): BelongsToMany
    {
        return $this->belongsToMany(Technology::class);
    }

    public function themes(): BelongsToMany
    {
        return $this->belongsToMany(Theme::class);
    }

    public function partners(): BelongsToMany
    {
        return $this->belongsToMany(Partner::class)->withPivot('role');
    }
}
