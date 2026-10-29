<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A second level under a technology's category ("Solar Energy" → "Solar
 * water pumping"). Free text, like `category` itself on the admin form —
 * the taxonomy has no parent/child structure to hang it from, and no admin
 * screen to maintain one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('technologies', function (Blueprint $table) {
            $table->string('subcategory')->nullable()->after('category')->index();
        });
    }

    public function down(): void
    {
        Schema::table('technologies', function (Blueprint $table) {
            $table->dropColumn('subcategory');
        });
    }
};
