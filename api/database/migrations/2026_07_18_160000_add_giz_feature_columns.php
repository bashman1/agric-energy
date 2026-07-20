<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Columns supporting the GIZ-inspired feature additions:
 *  - posts: newsroom category + a media gallery (for impact stories)
 *  - projects: budget figures + beneficiary count (map data / open data)
 *  - opportunities: type discriminator (funding/investment/tender/procurement)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // news | story | press_release | announcement
            $table->string('category')->default('news')->index()->after('title');
            $table->jsonb('gallery')->nullable()->after('featured_image');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('budget', 15, 2)->nullable()->after('funding_partner');
            $table->string('budget_currency')->nullable()->after('budget');
            $table->integer('beneficiary_count')->nullable()->after('budget_currency');
        });

        Schema::table('opportunities', function (Blueprint $table) {
            // funding | investment | tender | procurement
            $table->string('opportunity_type')->default('funding')->index()->after('funder');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['category', 'gallery']);
        });
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['budget', 'budget_currency', 'beneficiary_count']);
        });
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn('opportunity_type');
        });
    }
};
