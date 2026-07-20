<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Many-to-many join tables replacing the prototype's string-ID arrays
 * (technologyIds, themeIds, implementingPartnerIds, relatedResourceIds, …).
 * Gives real referential integrity — deleting an entity cascades its links.
 */
return new class extends Migration {
    /**
     * @param  string  $name   pivot table name
     * @param  array{0:string,1:string}  $a  [column prefix, referenced table]
     * @param  array{0:string,1:string}  $b  [column prefix, referenced table]
     */
    private function pivot(string $name, array $a, array $b): void
    {
        [$aCol, $aTable] = $a;
        [$bCol, $bTable] = $b;
        Schema::create($name, function (Blueprint $table) use ($aCol, $aTable, $bCol, $bTable) {
            $table->foreignId("{$aCol}_id")->constrained($aTable)->cascadeOnDelete();
            $table->foreignId("{$bCol}_id")->constrained($bTable)->cascadeOnDelete();
            $table->primary(["{$aCol}_id", "{$bCol}_id"]);
        });
    }

    public function up(): void
    {
        $project    = ['project', 'projects'];
        $technology = ['technology', 'technologies'];
        $theme      = ['theme', 'themes'];
        $partner    = ['partner', 'partners'];
        $resource   = ['resource', 'resources'];

        $this->pivot('project_technology', $project, $technology);
        $this->pivot('project_theme', $project, $theme);
        $this->pivot('partner_project', $partner, $project);
        $this->pivot('partner_technology', $partner, $technology);
        $this->pivot('partner_theme', $partner, $theme);
        $this->pivot('resource_technology', $resource, $technology);
        $this->pivot('resource_theme', $resource, $theme);
        $this->pivot('technology_theme', $technology, $theme);

        // Implementing vs funding partners on a project carry a role flag.
        Schema::table('partner_project', function (Blueprint $table) {
            $table->string('role')->default('implementing'); // implementing | funding
        });
    }

    public function down(): void
    {
        foreach ([
            'technology_theme', 'resource_theme', 'resource_technology',
            'partner_theme', 'partner_technology', 'partner_project',
            'project_theme', 'project_technology',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
