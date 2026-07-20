<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;

class Opportunity extends Model
{
    use Publishable;

    protected $table = 'opportunities';

    protected $guarded = ['id'];

    protected $casts = [
        'deadline' => 'date',
        'featured' => 'boolean',
        'published' => 'boolean',
        'reviewed_at' => 'datetime',
    ];
}
