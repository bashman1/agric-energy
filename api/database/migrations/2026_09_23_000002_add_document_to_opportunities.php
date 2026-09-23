<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A downloadable document on every opportunity, and one field for the
 * issuing body.
 *
 * Tenders carry the notice itself as a PDF, which until now could only be
 * linked to off-site through `external_url`. `document_url` holds an
 * uploaded file instead, matching how policies and resources already store
 * theirs.
 *
 * The backfill settles a split introduced with the job fields: `funder` and
 * `organization` both meant "who issued this". They keep one meaning each
 * from here — `organization` is the issuing or hiring body (tenders,
 * procurement notices, vacancies), `funder` is whoever pays (grants and
 * investment). Existing tenders carry their funder across so nothing
 * vanishes from the public site; the old value is left in place rather than
 * cleared, so switching a record back to a funding type restores it.
 */
return new class extends Migration
{
    /** Types whose issuer is an organization rather than a funder. */
    private const ORGANIZATION_TYPES = ['tender', 'procurement'];

    public function up(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->string('document_url')->nullable()->after('external_url');
        });

        DB::table('opportunities')
            ->whereIn('opportunity_type', self::ORGANIZATION_TYPES)
            ->whereNotNull('funder')
            ->where(function ($q) {
                $q->whereNull('organization')->orWhere('organization', '');
            })
            ->update(['organization' => DB::raw('funder')]);
    }

    public function down(): void
    {
        // Undo only the rows this migration wrote — anything edited since
        // no longer matches its funder and is left alone.
        DB::table('opportunities')
            ->whereIn('opportunity_type', self::ORGANIZATION_TYPES)
            ->whereRaw('organization = funder')
            ->update(['organization' => null]);

        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn('document_url');
        });
    }
};
