<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Give individual registrants a directory profile of their own.
 *
 * Until now only an organisation registration created a Partner record, so an
 * individual — a consultant, a researcher, an extension officer — registered,
 * was approved, and then existed nowhere the public could see. The Ecosystem
 * directory was advertised as covering both and in practice listed only
 * organisations.
 *
 * Individuals share the Partner table rather than getting one of their own:
 * they carry the same coverage, sector, expertise and contact attributes, and
 * they are linked to projects and resources through the same pivots. What
 * differs is a handful of person-shaped fields and the `entity_kind`
 * discriminator that lets the directory offer the two as separate facets.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            // organization | individual
            $table->string('entity_kind')->default('organization')->index()->after('type');

            // Person-shaped profile fields, null for organisations.
            $table->string('position')->nullable();
            $table->string('affiliation')->nullable();
            $table->string('years_experience')->nullable();
        });

        // Everything that exists today was created by the organisation flow.
        DB::table('partners')->update(['entity_kind' => 'organization']);
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn(['entity_kind', 'position', 'affiliation', 'years_experience']);
        });
    }
};
