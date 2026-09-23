<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Job/vacancy fields on opportunities.
 *
 * A vacancy is not a separate kind of record: it is the "job" opportunity
 * type, which already existed but had nowhere to put the things a job advert
 * actually needs. Every column here is nullable and stays empty for the
 * funding, investment, tender and procurement types — the admin and partner
 * forms only reveal them once the type is "job".
 *
 * `title` doubles as the job title and `summary` as the job summary, so the
 * listing cards, search index and export path keep working unchanged; only
 * their labels differ on a vacancy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            // The hiring employer. Distinct from `funder`, which on a grant
            // means whoever pays rather than whoever you would work for.
            $table->string('organization')->nullable()->after('funder');
            // Rich text (CKEditor) — hence text, not string.
            $table->text('duties_responsibilities')->nullable()->after('eligibility');
            $table->string('minimum_education')->nullable()->after('duties_responsibilities');
            $table->string('experience')->nullable()->after('minimum_education');
            $table->text('competences')->nullable()->after('experience');
        });
    }

    public function down(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn([
                'organization',
                'duties_responsibilities',
                'minimum_education',
                'experience',
                'competences',
            ]);
        });
    }
};
