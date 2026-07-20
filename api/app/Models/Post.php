<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use Publishable;

    protected $guarded = ['id'];

    protected $casts = [
        'published_at' => 'datetime',
        'gallery' => 'array',
        'featured' => 'boolean',
        'published' => 'boolean',
        'reviewed_at' => 'datetime',
    ];
}
