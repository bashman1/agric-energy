<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A project now names ONE partner by role and email address, entered on the
 * create form in place of the separate funding-partner select and
 * implementing-partner multi-select.
 *
 * The existing `funding_partner` column and the implementing side of the
 * project_partner pivot are kept and are still what the public page renders:
 * the controller resolves the email to a Partner and writes through to them.
 * These two columns record what was actually typed, so an address that
 * matches no registered partner can still be notified when the project goes
 * live.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('partner_role', 20)->nullable();
            $table->string('partner_email')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['partner_role', 'partner_email']);
        });
    }
};
