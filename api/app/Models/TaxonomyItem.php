<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxonomyItem extends Model
{
    protected $guarded = ['id'];

    /** Taxonomy groups mirrored from the prototype's Taxonomy interface. */
    public const GROUPS = [
        'value_chains',
        'project_statuses',
        'resource_types',
        'partner_types',
        'technology_categories',
        'beneficiary_tags',
    ];
}
