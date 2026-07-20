<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;

class Policy extends Model
{
    use Publishable;

    protected $table = 'policies';

    protected $guarded = ['id'];

    protected $casts = [
        'featured' => 'boolean',
        'published' => 'boolean',
        'reviewed_at' => 'datetime',
    ];
}
