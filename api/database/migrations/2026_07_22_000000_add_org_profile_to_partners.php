<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Organization profile fields captured by partner self-registration
 * (Individual vs Organization). Organizations create a pending Partner
 * draft; these columns hold their structured profile. Arrays follow the
 * existing jsonb + `=> 'array'` cast pattern used by regions /
 * district_coverage. `account_type` on users distinguishes individuals
 * (no Partner) from organizations (linked via users.partner_id).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            // Category (the detailed registration list, distinct from `type`).
            $table->string('category')->nullable()->index()->after('type');

            // Organization information.
            $table->string('acronym')->nullable();
            $table->string('registration_number')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('year_established')->nullable();
            $table->text('physical_address')->nullable();
            $table->string('postal_address')->nullable();

            // Geographic coverage (regions + district_coverage already exist).
            $table->jsonb('coverage_scope')->nullable();
            $table->jsonb('countries')->nullable();

            // Sectors & value chains.
            $table->jsonb('sectors')->nullable();
            $table->jsonb('value_chains')->nullable();

            // Profile (summary=brief description, description already exist).
            $table->text('mission')->nullable();
            $table->string('employees_band')->nullable();
            $table->string('branches_band')->nullable();
            $table->string('beneficiaries_band')->nullable();
            $table->string('annual_budget_range')->nullable();

            // Areas of expertise.
            $table->jsonb('expertise')->nullable();

            // Contact person.
            $table->string('contact_name')->nullable();
            $table->string('contact_position')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            // individual | organization
            $table->string('account_type')->default('individual')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'acronym',
                'registration_number',
                'tax_id',
                'year_established',
                'physical_address',
                'postal_address',
                'coverage_scope',
                'countries',
                'sectors',
                'value_chains',
                'mission',
                'employees_band',
                'branches_band',
                'beneficiaries_band',
                'annual_budget_range',
                'expertise',
                'contact_name',
                'contact_position',
                'contact_email',
                'contact_phone',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('account_type');
        });
    }
};
