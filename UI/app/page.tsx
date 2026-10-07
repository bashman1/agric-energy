"use client";

import { useEffect } from "react";
import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import ProjectCard from "@/components/public/ProjectCard";
import TechCard from "@/components/public/TechCard";
import ThemeCard from "@/components/public/ThemeCard";
import PartnersSlider from "@/components/public/PartnersSlider";
import ResourceCard from "@/components/public/ResourceCard";
import HeroBackdrop, { type HeroSlide } from "@/components/public/HeroBackdrop";
import { ArrowRightIcon, SearchIcon, MapPinIcon } from "@/components/shared/icons";
import Reveal from "@/components/shared/motion/Reveal";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import CountUp from "@/components/shared/motion/CountUp";
import BarChartH from "@/components/shared/charts/BarChartH";
import ChartFrame from "@/components/shared/charts/ChartFrame";
import SectionHeader from "@/components/home/SectionHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedProjects } from "@/lib/data/projects";
import { getPublishedTechnologies } from "@/lib/data/technologies";
import { getPublishedThemes } from "@/lib/data/themes";
import { getPublishedPartners } from "@/lib/data/partners";
import { getLatestResources } from "@/lib/data/resources";
import { getRegionStats } from "@/lib/data/open-data";
import { fmtNumber, fmtBudget } from "@/lib/utils/format";

export default function HomePage() {
  // Six requests, not eight. `getSiteConfig()` used to be awaited and then
  // thrown away by the destructure, and the project list was fetched twice —
  // once whole, once through filterProjects({featured:true}), which fetches
  // the same list internally. Featured projects are now derived in memory.
  const { data, loading, error, reload } = useAsync(async () => {
    const [allProjects, technologies, themes, partners, resources, regionStats] =
      await Promise.all([
        getPublishedProjects(),
        getPublishedTechnologies(),
        getPublishedThemes(),
        getPublishedPartners(),
        getLatestResources(4),
        getRegionStats(),
      ]);
    const projects = allProjects.filter((p) => p.featured);
    return { projects, technologies, themes, partners, resources, regionStats, allProjects };
  });

  useEffect(() => {
    document.title = "Agri-Energy Desk | Uganda's National Agri-Energy Platform";
  }, []);

  // The hero needs no data, so it paints on the first frame instead of
  // waiting behind six requests — the page used to show a bare "Loading…"
  // headline until every one of them resolved.
  if (loading || error || !data) {
    return (
      <>
        <Header />
        <main id="main-content" className="overflow-x-hidden">
          <Hero slides={[]} />
          {/* `loading` first: `data` is undefined for the whole of the load,
              so testing !data ahead of it flashes the failure message on
              every slow connection. */}
          {loading ? (
            <HomeSkeleton />
          ) : (
            <div className="container-page py-16">
              <p className="text-red-700">
                Failed to load homepage content.{" "}
                <button onClick={reload} className="underline font-semibold">
                  Retry
                </button>
              </p>
            </div>
          )}
        </main>
        <Footer />
      </>
    );
  }


  const { projects, technologies, themes, partners, resources, regionStats, allProjects } = data;

  const featuredTechs = technologies.filter((t) => t.featured).slice(0, 4);
  const featuredThemes = themes.filter((t) => t.featured).slice(0, 6);
  const featuredProjects = projects.slice(0, 3);

  // Hero backdrop: up to three project photos, featured projects first. A
  // project without its own photo is skipped rather than given a default
  // cover — the brand gradient already covers the no-photo case.
  const heroSlides: HeroSlide[] = [...projects, ...allProjects.filter((p) => !p.featured)]
    .filter((p) => p.featuredImage && p.featuredImage.trim())
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, image: p.featuredImage }));

  // A deliberate four, in this order — the platform's core collaborators,
  // not everyone in the directory. `nrep` used to be missing from this list's
  // output because the partner record existed only as an unpublished draft;
  // it is published now, so all four render. Anything named here that is not
  // published simply drops out, so keep the two in step.
  const sliderPartnerSlugs = ["snv-uganda", "maaif", "nrep", "memd"];
  const sliderPartners = sliderPartnerSlugs
    .map((slug) => partners.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Deliberately NOT useMemo: this sits after the loading and error early
  // returns, so a hook here is called on some renders and not others — which
  // is React error #310 ("rendered more hooks than during the previous
  // render") and crashes the whole page the moment the data arrives. It is a
  // Set over an array already in memory; there is nothing to memoise.
  const districtCount = new Set(
    allProjects.map((p) => p.district).filter(Boolean)
  ).size;

  const totalBeneficiaries = regionStats.reduce((n, r) => n + r.beneficiaries, 0);
  const totalBudget = regionStats.reduce((n, r) => n + r.totalBudget, 0);

  const stats = [
    { label: "Projects mapped", value: allProjects.length, formatted: fmtNumber(allProjects.length), compact: false },
    { label: "Districts reached", value: districtCount, formatted: fmtNumber(districtCount), compact: false },
    { label: "People reached", value: totalBeneficiaries, formatted: fmtNumber(totalBeneficiaries), compact: false },
    { label: "Investment mapped", value: totalBudget, formatted: fmtBudget(totalBudget), compact: true },
  ];

  const reachByRegion = [...regionStats]
    .sort((a, b) => b.beneficiaries - a.beneficiaries)
    .slice(0, 5)
    .map((r) => ({
      label: r.region,
      value: r.beneficiaries,
      display: fmtNumber(r.beneficiaries),
    }));

  return (
    <>
      <Header />
      <main id="main-content" className="overflow-x-hidden">
        <Hero slides={heroSlides} />

        {/* ─── IMPACT AT A GLANCE ────────────────────────────────── */}
        <section className="bg-white border-b border-ink-200">
          <div className="container-page py-14 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
              {/* Animated headline figures */}
              <div>
                <Reveal>
                  <span className="eyebrow">Impact at a glance</span>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900 mt-3">
                    The platform by the numbers
                  </h2>
                </Reveal>
                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dd className="font-display text-4xl lg:text-5xl font-semibold text-ink-900 tabular-nums">
                        <CountUp
                          value={s.value}
                          formatted={s.formatted}
                          compact={s.compact}
                        />
                      </dd>
                      <dt className="mt-1 text-sm font-medium text-ink-500">
                        {s.label}
                      </dt>
                    </div>
                  ))}
                </dl>
                <p className="mt-8 text-xs text-ink-400">
                  Figures aggregate projects published on this platform — not
                  official national statistics.
                </p>
              </div>

              {/* Regional bar chart */}
              {reachByRegion.length > 0 && (
                <Reveal delay={120}>
                  <div className="card p-6 lg:p-8">
                    <ChartFrame
                      eyebrow="Reach by region"
                      title="People reached, by region"
                      caption="Sum of beneficiaries across published projects in each region."
                    >
                      <BarChartH data={reachByRegion} />
                    </ChartFrame>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </section>

        {/* ─── MAP CALLOUT ───────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-ink-50">
          <Reveal className="container-page">
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
                <span className="shrink-0 inline-flex items-center gap-2 bg-paper text-primary-900 font-semibold px-5 py-3 rounded-lg group-hover:gap-3 transition-all">
                  Open the map
                  <ArrowRightIcon />
                </span>
              </div>
            </Link>
          </Reveal>
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
              <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </StaggerGrid>
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
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTechs.map((t) => (
                <TechCard key={t.id} tech={t} />
              ))}
            </StaggerGrid>
          </div>
        </section>

        {/* ─── THEMATIC AREAS ────────────────────────────────────── */}
        {/* Dark band: the knowledge hub reads as its own destination, and
            the colour-banded theme cards sit brightest against it. */}
        <section className="relative overflow-hidden bg-shade-950 py-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(55% 75% at 12% 0%, #14532d 0%, transparent 60%), radial-gradient(45% 65% at 95% 100%, #0f766e 0%, transparent 55%)",
            }}
          />
          <div className="container-page relative">
            <SectionHeader
              eyebrow="Knowledge hub"
              title="Thematic areas"
              description="Curated insight organised by focus area, from productive use to finance."
              href="/themes"
              linkLabel="Explore all themes"
              onDark
            />
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredThemes.map((t) => (
                <ThemeCard key={t.id} theme={t} />
              ))}
            </StaggerGrid>
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
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </StaggerGrid>
          </div>
        </section>

        {/* ─── PARTNERS ──────────────────────────────────────────── */}
        <PartnersSlider
          partners={sliderPartners.map((p) => ({
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
          <Reveal className="container-page relative text-center max-w-3xl">
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
              <Link href="/partner" className="btn btn-lg bg-paper text-primary-900 hover:bg-primary-100">
                Create account
              </Link>
              <Link
                href="/about"
                className="btn btn-lg border border-white/30 text-white hover:bg-white/10"
              >
                Learn more
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}


// ─── Hero ─────────────────────────────────────────────────────
// Rendered in every state, including while the data loads, so the search
// box and headline are usable immediately. `slides` is empty until the
// projects arrive; the backdrop shows the plain brand gradient meanwhile.

function Hero({ slides }: { slides: HeroSlide[] }) {
  return (
    <HeroBackdrop slides={slides}>
      <Reveal className="max-w-3xl">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight">
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
      </Reveal>
    </HeroBackdrop>
  );
}

// ─── Loading placeholder ──────────────────────────────────────
// Blocks matching the real sections' rhythm, so the page does not jump
// when the content lands.

function HomeSkeleton() {
  return (
    <div aria-hidden="true" className="container-page py-16 lg:py-20">
      <div className="h-4 w-32 rounded bg-ink-100" />
      <div className="mt-4 h-8 w-72 max-w-full rounded bg-ink-100" />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-64 overflow-hidden">
            <div className="h-20 bg-ink-100" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-ink-100" />
              <div className="h-3 w-full rounded bg-ink-100" />
              <div className="h-3 w-5/6 rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
