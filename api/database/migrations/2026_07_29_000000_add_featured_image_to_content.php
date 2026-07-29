<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a `featured_image` cover-photo column to the content types that lacked
 * one (themes, technologies, resources). Projects, events and posts already
 * had it; partners use `logo`. Mirrors the existing projects.featured_image.
 */
return new class extends Migration
{
    private array $tables = ['themes', 'technologies', 'resources'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('featured_image')->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('featured_image');
            });
        }
    }
};
