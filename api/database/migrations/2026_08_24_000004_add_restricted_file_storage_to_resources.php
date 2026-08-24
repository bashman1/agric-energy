<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make "view online only" mean something at the file layer.
 *
 * `file_downloadable` already existed, but it only decided which button the
 * resource page rendered: the file itself stayed on the public disk under a
 * permanent /storage/... path, so anyone with the address — including the
 * browser's own PDF viewer, one click from "Save" — could take a copy. A
 * contributor told their material would not be redistributed was being told
 * something the platform did not enforce.
 *
 * These columns record where the file actually lives. A view-only resource is
 * moved onto the private disk, where nginx cannot reach it, and is served only
 * through a short-lived signed route that streams it inline. Toggling the
 * setting moves the file between disks (see ResourceController).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            // public | local  — the filesystem disk holding the file.
            $table->string('file_disk')->nullable()->after('file_downloadable');
            // Path within that disk, e.g. "restricted/abc123.pdf".
            $table->string('file_path')->nullable()->after('file_disk');
            // Original upload name, so a download still arrives sensibly named.
            $table->string('file_name')->nullable()->after('file_path');
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn(['file_disk', 'file_path', 'file_name']);
        });
    }
};
