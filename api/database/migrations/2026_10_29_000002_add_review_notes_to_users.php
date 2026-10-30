<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The reviewer's reason when a registration is turned down. The applicant
 * is emailed it; storing it as well means the admin Users page can show why
 * an account sits at `rejected`, and the reason survives a later re-review.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('review_notes')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('review_notes');
        });
    }
};
