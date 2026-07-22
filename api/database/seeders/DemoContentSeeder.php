<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Opportunity;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Demo content generator — populates events, opportunities (funding/investment),
 * tenders (tender/procurement), and news posts across every sub-category so the
 * public pages have realistic, varied data to render.
 *
 * Idempotent: records are keyed by slug (prefix "demo-…") via updateOrCreate, so
 * re-running refreshes rather than duplicates. Run with:
 *   php artisan db:seed --class=DemoContentSeeder
 */
class DemoContentSeeder extends Seeder
{
    /** Deterministic pseudo-randomness so re-seeds are stable. */
    private const SEED = 20260720;

    private const DISTRICTS = [
        ['Kampala', 'Central Uganda'], ['Masaka', 'Central Uganda'], ['Mukono', 'Central Uganda'],
        ['Wakiso', 'Central Uganda'], ['Luwero', 'Central Uganda'],
        ['Jinja', 'Eastern Uganda'], ['Mbale', 'Eastern Uganda'], ['Soroti', 'Eastern Uganda'],
        ['Tororo', 'Eastern Uganda'], ['Iganga', 'Eastern Uganda'],
        ['Gulu', 'Northern Uganda'], ['Lira', 'Northern Uganda'], ['Arua', 'Northern Uganda'],
        ['Kitgum', 'Northern Uganda'], ['Moroto', 'Northern Uganda'],
        ['Mbarara', 'Western Uganda'], ['Fort Portal', 'Western Uganda'], ['Kabale', 'Western Uganda'],
        ['Hoima', 'Western Uganda'], ['Kasese', 'Western Uganda'],
    ];

    private const TOPICS = [
        'Solar Irrigation', 'Biogas Systems', 'Solar Cold Storage', 'Solar Mini-Grids',
        'Solar-Powered Milling', 'Clean Cooking', 'Agrivoltaics', 'Solar Water Pumping',
        'E-Mobility for Agriculture', 'Productive Use of Energy', 'Solar Drying',
        'Improved Cookstoves', 'Biomass Briquettes', 'Solar Aeration for Aquaculture',
    ];

    private const VALUE_CHAINS = [
        'Coffee', 'Dairy', 'Maize', 'Horticulture', 'Fisheries', 'Poultry',
        'Banana/Plantain', 'Rice', 'Tea', 'Beans', 'Cassava', 'Vegetables',
    ];

    private const FUNDERS = [
        'GIZ', 'European Union', 'World Bank', 'USAID Power Africa', 'African Development Bank',
        'Green Climate Fund', 'UNDP', 'FAO', 'UNCDF', 'GET.invest', 'Shell Foundation', 'AECF',
    ];

    private const PROCURERS = [
        'Ministry of Energy and Mineral Development', 'Rural Electrification Agency',
        'Uganda Energy Credit Capitalisation Company', 'UNDP Uganda', 'GIZ Uganda',
        'Ministry of Agriculture, Animal Industry and Fisheries', 'National Renewable Energy Platform',
        'Uganda National Renewable Energy and Energy Efficiency Alliance',
    ];

    private int $adminId = 1;
    private ?Carbon $today = null;

    public function run(): void
    {
        mt_srand(self::SEED);
        $this->adminId = (int) (User::query()->min('id') ?? 1);
        $this->today = Carbon::create(2026, 7, 20);

        $this->seedEvents();
        $this->seedOpportunities();
        $this->seedTenders();
        $this->seedPosts();

        $this->command?->info('Demo content seeded: 20 events, 20 opportunities, 20 tenders, 20 posts.');
    }

    private function pick(array $arr): mixed
    {
        return $arr[mt_rand(0, count($arr) - 1)];
    }

    private function img(string $slug, int $w = 1200, int $h = 700): string
    {
        return "https://picsum.photos/seed/{$slug}/{$w}/{$h}";
    }

    // ── Events (20, cycling the event types) ────────────────────────────────
    private function seedEvents(): void
    {
        $types = ['webinar', 'workshop', 'conference', 'training', 'field-visit', 'exhibition', 'policy-dialogue', 'launch'];
        $titleFmt = [
            'webinar' => 'Webinar: %s in %s',
            'workshop' => '%s Training Workshop — %s',
            'conference' => 'National %s Conference',
            'training' => 'Hands-on %s Training — %s',
            'field-visit' => '%s Field Demonstration — %s',
            'exhibition' => 'Agri-Energy Expo: %s',
            'policy-dialogue' => 'Policy Dialogue on %s',
            'launch' => 'Launch: %s Programme — %s',
        ];

        for ($i = 0; $i < 20; $i++) {
            $type = $types[$i % count($types)];
            $topic = self::TOPICS[$i % count(self::TOPICS)];
            [$district, $region] = self::pick(self::DISTRICTS);
            $online = in_array($type, ['webinar', 'policy-dialogue']) || mt_rand(0, 4) === 0;

            $title = match ($type) {
                'conference', 'exhibition', 'policy-dialogue' => sprintf($titleFmt[$type], $topic),
                default => sprintf($titleFmt[$type], $topic, $district),
            };
            $slug = 'demo-event-' . ($i + 1) . '-' . Str::slug($topic);

            // Spread across past and future so upcoming/past tabs both fill.
            $offset = ($i % 2 === 0) ? ($i * 4 + 5) : -($i * 3 + 4);
            $start = $this->today->copy()->addDays($offset)->setTime(9, 0);

            Event::updateOrCreate(['slug' => $slug], [
                'title' => $title,
                'type' => $type,
                'summary' => "A {$type} bringing together practitioners, farmers and financiers around {$topic} for Uganda's agri-energy sector.",
                'description' => "This {$type} focuses on {$topic} with practical sessions, case studies from {$region}, and networking. "
                    . "Participants will explore financing models, technical standards and deployment lessons relevant to {$district} and beyond. "
                    . "Agenda includes expert panels, live demonstrations and Q&A with implementers.",
                'starts_at' => $start,
                'ends_at' => $start->copy()->addHours(mt_rand(2, 6)),
                'is_online' => $online,
                'location' => $online ? 'Online (Zoom)' : "{$district}, Uganda",
                'registration_url' => "https://events.agrienergy.nrep.ug/register/{$slug}",
                'featured_image' => $this->img($slug),
                'featured' => $i % 6 === 0,
                'published' => true,
                'workflow_status' => 'published',
                'created_by' => $this->adminId,
            ]);
        }
    }

    // ── Opportunities: funding + investment (20) ────────────────────────────
    private function seedOpportunities(): void
    {
        $types = ['funding', 'investment'];
        for ($i = 0; $i < 20; $i++) {
            $type = $types[$i % 2];
            $topic = self::TOPICS[$i % count(self::TOPICS)];
            $vc = self::VALUE_CHAINS[$i % count(self::VALUE_CHAINS)];
            [, $region] = self::pick(self::DISTRICTS);
            $funder = self::pick(self::FUNDERS);
            $amount = mt_rand(50, 2000) * 1000;
            $slug = 'demo-opp-' . ($i + 1) . '-' . Str::slug($topic);

            $title = $type === 'funding'
                ? "{$topic} Grant Fund for {$vc}"
                : "{$topic} Investment Facility — {$vc} Value Chain";

            Opportunity::updateOrCreate(['slug' => $slug], [
                'title' => $title,
                'opportunity_type' => $type,
                'funder' => $funder,
                'summary' => ($type === 'funding' ? 'Grant' : 'Blended-finance') . " support for {$topic} enterprises serving the {$vc} value chain in {$region}.",
                'description' => "{$funder} is offering {$type} support for scalable {$topic} solutions in Uganda's {$vc} value chain. "
                    . "The facility targets SMEs, cooperatives and technology providers with proven productive-use models. "
                    . "Successful applicants receive capital plus technical assistance on business development and monitoring.",
                'amount' => $amount,
                'currency' => $i % 4 === 0 ? 'EUR' : 'USD',
                'sector' => $topic,
                'value_chain' => $vc,
                'region' => $region,
                'deadline' => $this->today->copy()->addDays(($i + 1) * 12 + 20),
                'eligibility' => 'Registered Ugandan enterprises, cooperatives or NGOs with at least one year of operations in the agri-energy sector.',
                'external_url' => "https://opportunities.agrienergy.nrep.ug/{$slug}",
                'featured' => $i % 5 === 0,
                'published' => true,
                'workflow_status' => 'published',
                'created_by' => $this->adminId,
            ]);
        }
    }

    // ── Tenders: tender + procurement (20) ──────────────────────────────────
    private function seedTenders(): void
    {
        $types = ['tender', 'procurement'];
        $equip = [
            'Solar Water Pumps', 'Solar Cold Rooms', 'Biogas Digesters', 'Solar Milling Units',
            'Mini-Grid Components', 'Solar Dryers', 'Improved Cookstoves', 'PV Modules and Inverters',
            'Solar Irrigation Kits', 'E-Bikes and Charging Stations',
        ];
        for ($i = 0; $i < 20; $i++) {
            $type = $types[$i % 2];
            $item = $equip[$i % count($equip)];
            [$district, $region] = self::pick(self::DISTRICTS);
            $procurer = self::pick(self::PROCURERS);
            $amount = mt_rand(80, 900) * 1000;
            $slug = 'demo-tender-' . ($i + 1) . '-' . Str::slug($item);

            $title = $type === 'tender'
                ? "Supply and Installation of {$item} — {$district}"
                : "Procurement of {$item} for {$region}";

            Opportunity::updateOrCreate(['slug' => $slug], [
                'title' => $title,
                'opportunity_type' => $type,
                'funder' => $procurer,
                'summary' => ucfirst($type) . " for the supply, delivery and commissioning of {$item} in {$district}.",
                'description' => "{$procurer} invites sealed bids from eligible and qualified firms for the {$type} of {$item}. "
                    . "The scope covers supply, delivery, installation, testing, commissioning and operator training in {$region}. "
                    . "Bidders must demonstrate relevant experience, financial capacity and after-sales support presence in Uganda. "
                    . "Bid documents are obtainable upon a non-refundable fee; late bids will be rejected.",
                'amount' => $amount,
                'currency' => 'UGX',
                'sector' => 'Procurement',
                'value_chain' => self::VALUE_CHAINS[$i % count(self::VALUE_CHAINS)],
                'region' => $region,
                'deadline' => $this->today->copy()->addDays(($i % 6) * 7 + 14),
                'eligibility' => 'Firms registered with PPDA, tax-compliant, with demonstrated experience supplying renewable-energy equipment.',
                'external_url' => "https://tenders.agrienergy.nrep.ug/{$slug}",
                'featured' => $i % 7 === 0,
                'published' => true,
                'workflow_status' => 'published',
                'created_by' => $this->adminId,
            ]);
        }
    }

    // ── Posts / News (20, cycling categories) ───────────────────────────────
    private function seedPosts(): void
    {
        $cats = ['news', 'story', 'press_release', 'announcement'];
        for ($i = 0; $i < 20; $i++) {
            $cat = $cats[$i % count($cats)];
            $topic = self::TOPICS[$i % count(self::TOPICS)];
            [$district, $region] = self::pick(self::DISTRICTS);
            $vc = self::VALUE_CHAINS[$i % count(self::VALUE_CHAINS)];

            $title = match ($cat) {
                'news' => "{$topic} rollout gathers pace in {$region}",
                'story' => "How {$topic} transformed {$vc} farming in {$district}",
                'press_release' => "NREP announces new {$topic} initiative for {$district}",
                'announcement' => "Applications open: {$topic} support for {$vc} cooperatives",
                default => "{$topic} update",
            };
            $slug = 'demo-post-' . ($i + 1) . '-' . Str::slug($topic);

            $body = "<p>{$topic} is gaining momentum across {$region}, where farmers in the {$vc} value chain are "
                . "adopting clean-energy solutions to cut costs and boost productivity.</p>"
                . "<p>In {$district}, cooperatives report improved yields and reduced post-harvest losses after deploying "
                . "{$topic} systems. Development partners and the National Renewable Energy Platform (NREP) continue to "
                . "coordinate financing, technical standards and monitoring to scale what works.</p>"
                . "<p>\"This is exactly the kind of productive-use investment Uganda's agri-energy sector needs,\" said a "
                . "programme coordinator. Further rollouts are planned for neighbouring districts over the coming seasons.</p>";

            $gallery = $cat === 'story'
                ? [$this->img($slug . '-a'), $this->img($slug . '-b'), $this->img($slug . '-c'), $this->img($slug . '-d')]
                : null;

            Post::updateOrCreate(['slug' => $slug], [
                'title' => $title,
                'category' => $cat,
                'excerpt' => "{$topic} progress in {$district}: how it is reshaping the {$vc} value chain across {$region}.",
                'body' => $body,
                'featured_image' => $this->img($slug),
                'gallery' => $gallery,
                'published_at' => $this->today->copy()->subDays($i * 3 + 1),
                'featured' => $i % 5 === 0,
                'published' => true,
                'workflow_status' => 'published',
                'created_by' => $this->adminId,
            ]);
        }
    }
}
