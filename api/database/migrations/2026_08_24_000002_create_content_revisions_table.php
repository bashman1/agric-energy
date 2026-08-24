<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pending edits to already-published records.
 *
 * A contributor or partner may revise a record after it has gone live, but the
 * live version must not change on their say-so, and it must not vanish from the
 * public site while the revision is being reviewed. So the edit is parked here
 * as a payload, the published record is left exactly as it is, and the review
 * queue picks the revision up alongside first-time submissions. Approval
 * applies the payload; rejection discards it with notes.
 *
 * Polymorphic because every publishable entity can be revised this way.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_revisions', function (Blueprint $table) {
            $table->id();
            $table->morphs('revisable');

            // The proposed attributes, in the same column shape the model
            // would have been updated with, plus a `__relations` key holding
            // the slug arrays for many-to-many syncing.
            $table->jsonb('payload');

            // pending | approved | rejected
            $table->string('status')->default('pending')->index();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // The queue reads "pending revisions, oldest first".
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_revisions');
    }
};
