<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Core domain tables for the Agri-Energy Desk.
 *
 * Mirrors the prototype's TypeScript models (UI/lib/types/index.ts). Every
 * content entity carries the editorial workflow columns (workflow_status,
 * published, featured) and an optional created_by author, so the same table
 * serves both admin-authored and partner-submitted records.
 */
return new class extends Migration {
    /** Columns shared by every publishable content entity. */
    private function contentColumns(Blueprint $table): void
    {
        $table->boolean('featured')->default(false);
        $table->boolean('published')->default(false);
        // draft | pending | in_review | approved | published | rejected | archived
        $table->string('workflow_status')->default('draft')->index();
        $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        $table->text('review_notes')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->timestamps();
    }

    public function up(): void
    {
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->text('why_it_matters')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('technologies', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('category')->nullable()->index();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->jsonb('applications')->nullable();
            $table->jsonb('benefits')->nullable();
            $table->jsonb('limitations')->nullable();
            $table->jsonb('operational_notes')->nullable();
            $table->jsonb('maintenance_notes')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('type')->nullable()->index();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('website')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('logo')->nullable();
            $table->jsonb('regions')->nullable();
            $table->jsonb('district_coverage')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('region')->nullable()->index();
            $table->string('district')->nullable()->index();
            $table->jsonb('regions')->nullable();
            $table->jsonb('districts')->nullable();
            $table->string('location_note')->nullable();
            $table->decimal('lat', 10, 6)->nullable();
            $table->decimal('lng', 10, 6)->nullable();
            $table->string('funding_partner')->nullable();
            $table->string('value_chain')->nullable()->index();
            $table->jsonb('beneficiaries')->nullable();
            $table->string('status')->nullable()->index();
            $table->string('start_date')->nullable();
            $table->string('end_date')->nullable();
            $table->text('outcomes')->nullable();
            $table->string('featured_image')->nullable();
            $table->jsonb('gallery')->nullable();
            $table->string('external_url')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('type')->nullable()->index();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('file_url')->nullable();
            $table->string('external_url')->nullable();
            $table->string('publication_date')->nullable();
            $this->contentColumns($table);
        });

        // ── New modules ───────────────────────────────────────────────
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            // conference | workshop | webinar | training
            $table->string('type')->nullable()->index();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_online')->default(false);
            $table->string('location')->nullable();
            $table->string('registration_url')->nullable();
            $table->string('featured_image')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('funder')->nullable();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('amount')->nullable();
            $table->string('currency')->nullable();
            $table->string('sector')->nullable()->index();
            $table->string('value_chain')->nullable()->index();
            $table->string('region')->nullable()->index();
            $table->date('deadline')->nullable();
            $table->text('eligibility')->nullable();
            $table->string('external_url')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('policies', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('category')->nullable()->index();
            $table->text('summary')->nullable();
            $table->text('description')->nullable();
            $table->string('document_url')->nullable();
            $table->string('publication_date')->nullable();
            $this->contentColumns($table);
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('excerpt')->nullable();
            $table->longText('body')->nullable();
            $table->string('featured_image')->nullable();
            $table->timestamp('published_at')->nullable();
            $this->contentColumns($table);
        });

        // ── Singletons / support ──────────────────────────────────────
        Schema::create('taxonomy_items', function (Blueprint $table) {
            $table->id();
            // value_chains | project_statuses | resource_types | partner_types
            // | technology_categories | beneficiary_tags
            $table->string('group')->index();
            $table->string('name');
            $table->string('slug');
            $table->integer('sort')->default(0);
            $table->timestamps();
            $table->unique(['group', 'slug']);
        });

        Schema::create('site_config', function (Blueprint $table) {
            $table->id();
            $table->jsonb('hero')->nullable();
            $table->jsonb('stats')->nullable();
            $table->jsonb('featured')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->text('about_summary')->nullable();
            $table->timestamps();
        });

        Schema::create('submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('submission_type')->default('contact');
            $table->string('name');
            $table->string('organisation')->nullable();
            $table->string('email');
            $table->string('subject')->nullable();
            $table->text('message');
            // new | read | responded | archived
            $table->string('status')->default('new')->index();
            // not_sent | sent | failed
            $table->string('email_status')->default('not_sent');
            $table->text('admin_notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'submissions', 'site_config', 'taxonomy_items', 'posts', 'policies',
            'opportunities', 'events', 'resources', 'projects', 'partners',
            'technologies', 'themes',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
