<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Downloadable file attachments for a project — an array of
 * { url, name, size } objects, populated from the /media upload endpoint
 * (kind=document). Mirrors the existing jsonb `gallery` column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->jsonb('attachments')->nullable()->after('gallery');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('attachments');
        });
    }
};
