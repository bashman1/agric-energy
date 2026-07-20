import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import ProjectCard from "@/components/public/ProjectCard";
import TechCard from "@/components/public/TechCard";
import ThemeCard from "@/components/public/ThemeCard";
import PartnersSlider from "@/components/public/PartnersSlider";
import ResourceCard from "@/components/public/ResourceCard";
import { ArrowRightIcon, SearchIcon, MapPinIcon } from "@/components/shared/icons";
import { getSiteConfig } from "@/lib/data/site-config";
import { filterProjects, getPublishedProjects } from "@/lib/data/projects";
import { getPublishedTechnologies } from "@/lib/data/technologies";
import { getPublishedThemes } from "@/lib/data/themes";
import { getPublishedPartners } from "@/lib/data/partners";
import { getLatestResources } from "@/lib/data/resources";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agri-Energy Desk | Uganda's National Agri-Energy Platform",
  description:
    "Uganda's national digital knowledge and project intelligence platform for energy use in agriculture.",
};

// Small helper for the repeated "section header + browse link" pattern.
function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  onDark = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <span className={`eyebrow ${onDark ? "on-dark" : ""}`}>{eyebrow}</span>
        <h2
          className={`font-display text-3xl font-semibold tracking-tight mt-3 ${
            onDark ? "text-white" : "text-ink-900"
          }`}
        >
          {title}
        </h2>
        <p className={`mt-2 text-base ${onDark ? "text-ink-300" : "text-ink-500"}`}>
          {description}
        </p>
      </div>
      <Link
        href={href}
        className={`group inline-flex items-center gap-1.5 font-semibold text-sm whitespace-nowrap ${
          onDark
            ? "text-primary-300 hover:text-primary-200"
            : "text-primary-700 hover:text-primary-800"
        }`}
      >
        {linkLabel}
        <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [, projects, technologies, themes, partners, resources] =
    await Promise.all([
      getSiteConfig(),
      filterProjects({ featured: true }, true),
      getPublishedTechnologies(),
      getPublishedThemes(),
      getPublishedPartners(),
      getLatestResources(4),
    ]);

  const featuredTechs = technologies.filter((t) => t.featured).slice(0, 4);
  const featuredThemes = themes.filter((t) => t.featured).slice(0, 6);
  const featuredProjects = projects.slice(0, 3);

  const allProjects = await getPublishedProjects();
  const districtCount = new Set(
    allProjects.map((p) => p.district).filter(Boolean)
  ).size;

  const stats = [
    { label: "Projects mapped", value: allProjects.length },
    { label: "Technologies", value: technologies.length },
    { label: "Resources", value: resources.length },
    { label: "Districts reached", value: districtCount },
  ];

  return (
    <>
      <Header />
      <main id="main-content" className="overflow-x-hidden">
        {/* ─── HERO ──────────────────────────────────────────────── */}
        <section className="hero-band relative bg-primary-900 text-white overflow-hidden">
          {/* soft radial highlight — restrained, no noise/glass */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(60% 80% at 15% 0%, #166534 0%, transparent 60%), radial-gradient(50% 70% at 100% 20%, #0f766e 0%, transparent 55%)",
            }}
          />
          {/* faint dotted grid */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="container-page relative py-20 lg:py-28">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-100 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-300" aria-hidden="true" />
                Phase 1 prototype · sample data
              </span>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight mt-6">
                Uganda&apos;s national<br />
                <span className="text-primary-300">agri-energy platform</span>
              </h1>

              <p className="mt-6 text-lg text-primary-50/90 leading-relaxed max-w-2xl">
                One place to map projects, compare technologies, and reach the
                knowledge accelerating clean-energy adoption across Ugandan
                agriculture.
              </p>

              {/* Search */}
              <form
                action="/search"
                method="GET"
                role="search"
                className="mt-9 max-w-xl"
              >
                <label htmlFor="hero-search" className="sr-only">
                  Search the Agri-Energy Desk
                </label>
                <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-raise">
                  <span className="pl-2 text-ink-400 text-xl" aria-hidden="true">
                    <SearchIcon />
                  </span>
                  <input
                    id="hero-search"
                    name="q"
                    type="search"
                    placeholder="Search projects, technologies, resources…"
                    className="flex-1 bg-transparent text-ink-900 placeholder-ink-400 px-1 py-2 text-base focus:outline-none min-w-0"
                  />
                  <button type="submit" className="btn btn-primary shrink-0">
                    Search
                  </button>
                </div>
              </form>

              {/* Quick entry links */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-100">
                <span className="text-primary-300/80">Jump to:</span>
                {[
                  ["Project map", "/map"],
                  ["Technologies", "/technologies"],
                  ["Open data", "/data"],
                  ["Tenders", "/tenders"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="font-medium hover:text-white underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS BAND ────────────────────────────────────────── */}
        <section className="bg-white border-b border-ink-200">
          <div className="container-page">
            <dl className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-ink-100 sm:divide-y-0">
              {stats.map((s) => (
                <div key={s.label} className="px-2 py-8 text-center lg:py-10">
                  <dd className="font-display text-4xl lg:text-5xl font-semibold text-ink-900 tabular-nums">
                    {s.value}
                  </dd>
                  <dt className="mt-1 text-sm font-medium text-ink-500">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── MAP CALLOUT ───────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-ink-50">
          <div className="container-page">
            <Link
              href="/map"
              className="group block relative overflow-hidden rounded-2xl bg-primary-900 border border-primary-800"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-25 transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 40%, #16a34a 0, transparent 45%), radial-gradient(circle at 75% 60%, #0f766e 0, transparent 40%)",
                }}
              />
              <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left max-w-xl">
                  <span className="eyebrow on-dark">Live map</span>
                  <h2 className="font-display text-3xl font-semibold text-white mt-3 mb-3">
                    Explore projects across Uganda
                  </h2>
                  <p className="text-primary-100 leading-relaxed">
                    Filter by region, district, value chain, and status to see
                    where agri-energy interventions cluster — and where the
                    coverage gaps are.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-2 bg-white text-primary-900 font-semibold px-5 py-3 rounded-lg group-hover:gap-3 transition-all">
                  Open the map
                  <ArrowRightIcon />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ─── FEATURED PROJECTS ─────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container-page">
            <SectionHeader
              eyebrow="Project database"
              title="Featured projects"
              description="High-impact agri-energy interventions from across the country."
              href="/projects"
              linkLabel="Browse all projects"
            />
            {featuredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <p className="text-ink-500">No featured projects yet.</p>
            )}
          </div>
        </section>

        {/* ─── TECHNOLOGIES ──────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-ink-50 border-y border-ink-200">
          <div className="container-page">
            <SectionHeader
              eyebrow="Technology library"
              title="Proven agri-energy solutions"
              description="Tested technologies ready for deployment, with applications and context."
              href="/technologies"
              linkLabel="Browse the catalog"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTechs.map((t) => (
                <TechCard key={t.id} tech={t} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── THEMATIC AREAS ────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container-page">
            <SectionHeader
              eyebrow="Knowledge hub"
              title="Thematic areas"
              description="Curated insight organised by focus area, from productive use to finance."
              href="/themes"
              linkLabel="Explore all themes"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredThemes.map((t) => (
                <ThemeCard key={t.id} theme={t} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── LATEST RESOURCES ──────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-ink-50 border-y border-ink-200">
          <div className="container-page">
            <SectionHeader
              eyebrow="Resource library"
              title="Latest resources"
              description="Reports, field guides, policy briefs, and case studies."
              href="/resources"
              linkLabel="Access the library"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── PARTNERS ──────────────────────────────────────────── */}
        <PartnersSlider
          partners={partners.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            logo: p.logo ?? "",
          }))}
        />

        {/* ─── CTA BAND ──────────────────────────────────────────── */}
        <section className="py-20 bg-primary-900 text-white relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(50% 100% at 50% 0%, #166534 0%, transparent 70%)",
            }}
          />
          <div className="container-page relative text-center max-w-3xl">
            <span className="inline-flex items-center gap-2 text-primary-200 text-sm font-medium">
              <MapPinIcon /> Government of Uganda · NREP Secretariat
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-4 mb-5">
              Implementing an agri-energy project?
            </h2>
            <p className="text-primary-50/90 text-lg leading-relaxed mb-9">
              Add it to Uganda&apos;s national knowledge base. Your data helps map
              the landscape, surface gaps, and direct funding to priority areas.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/contact" className="btn btn-lg bg-white text-primary-900 hover:bg-primary-50">
                Register your project
              </Link>
              <Link
                href="/about"
                className="btn btn-lg border border-white/30 text-white hover:bg-white/10"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
