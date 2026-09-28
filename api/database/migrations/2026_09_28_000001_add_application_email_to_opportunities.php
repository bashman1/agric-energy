<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where applications go, and room for formatted education/experience.
 *
 * `application_email` is the address a candidate or bidder sends to when
 * there is no application portal to link out to. Vacancies, tenders and
 * procurement notices offer it; grants and investment calls keep their
 * `external_url` instead.
 *
 * `minimum_education` and `experience` become CKEditor fields, so they move
 * from varchar(255) to text. Left as strings, a requirements list of any
 * length would be truncated on save — silently on MySQL, as an error on
 * Postgres. Neither is a good way to find out.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->string('application_email')->nullable()->after('external_url');
            $table->text('minimum_education')->nullable()->change();
            $table->text('experience')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn('application_email');
            // Any HTML long enough to need `text` would not survive the trip
            // back, so this only restores the type, not lost content.
            $table->string('minimum_education')->nullable()->change();
            $table->string('experience')->nullable()->change();
        });
    }
};
