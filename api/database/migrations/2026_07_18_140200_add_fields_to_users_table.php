<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend users for partner self-registration: an account status the admin
 * approves (pending → approved) plus profile fields, and an optional link to
 * the Partner directory profile the account manages.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // pending | approved | suspended
            $table->string('status')->default('approved')->index()->after('email');
            $table->string('organisation')->nullable()->after('status');
            $table->string('phone')->nullable()->after('organisation');
            $table->foreignId('partner_id')->nullable()->after('phone')
                ->constrained('partners')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('partner_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('partner_id');
            $table->dropColumn(['status', 'organisation', 'phone', 'approved_at']);
        });
    }
};
