<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteConfig extends Model
{
    protected $table = 'site_config';

    protected $guarded = ['id'];

    protected $casts = [
        'hero' => 'array',
        'stats' => 'array',
        'featured' => 'array',
    ];

    /** The single configuration row (created on first access). */
    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1]);
    }
}
