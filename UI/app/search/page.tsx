import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import SearchAutocomplete from "@/components/public/SearchAutocomplete";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { searchAll, type SearchHit } from "@/lib/data/search";

export const metadata: Metadata = {
  title: "Search — Agri-Energy Desk",
  description:
    "Ranked search across projects, technologies, themes, resources, partners, events and opportunities.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

// ── Type metadata (keyed by the API's plural type slugs) ──────────────────────
const TYPE_META = {
  projects: { label: "Projects", color: "bg-primary-100 text-primary-700 border-primary-200", icon: "🏗️" },
  technologies: { label: "Technologies", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "⚡" },
  themes: { label: "Themes", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "📚" },
  resources: { label: "Resources", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "📄" },
  partners: { label: "Partners", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "🤝" },
  events: { label: "Events", color: "bg-pink-100 text-pink-700 border-pink-200", icon: "📅" },
  opportunities: { label: "Opportunities", color: "bg-teal-100 text-teal-700 border-teal-200", icon: "💰" },
} as const;
type ResultType = keyof typeof TYPE_META;

const BROWSE_LINKS: [string, string][] = [
  ["/projects", "Projects"],
  ["/technologies", "Technologies"],
  ["/resources", "Resources"],
  ["/events", "Events"],
  ["/opportunities", "Opportunities"],
];

export default async function SearchPage({ searchParams }: PageProps) {
  const t = await getTranslations("Search");
  const tTypes = await getTranslations("Types");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const typeParam = (params.type ?? "") as ResultType | "";
  const activeType: ResultType | "" = typeParam in TYPE_META ? typeParam : "";

  const { data: allResults, facets } = q.length >= 2
    ? await searchAll(q)
    : { data: [] as SearchHit[], facets: {} as Record<string, number> };

  const results = activeType
    ? allResults.filter((r) => r.type === activeType)
    : allResults;

  const isEmpty = q.length < 2;
  const noResults = !isEmpty && allResults.length === 0;

  const tabHref = (type: ResultType | "") =>
    `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`;

  return (
    <>
      <Header />
      <main>
        {/* ── Header band with search bar ── */}
        <section className="bg-primary-800 text-white py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              {t("label")}
            </div>
            <h1 className="text-3xl font-extrabold mb-5">{t("heading")}</h1>
            <SearchAutocomplete variant="page" defaultValue={q} autoFocus />
          </div>
        </section>

        {/* ── Tab bar (facets) ── */}
        {allResults.length > 0 && (
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <nav className="flex gap-0 overflow-x-auto scrollbar-none" aria-label={t("filterByType")}>
                <Link
                  href={tabHref("")}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    !activeType
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {t("all")}
                  <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${!activeType ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                    {allResults.length}
                  </span>
                </Link>
                {(Object.keys(TYPE_META) as ResultType[])
                  .filter((t) => facets[t])
                  .map((type) => {
                    const m = TYPE_META[type];
                    const isActive = activeType === type;
                    return (
                      <Link
                        key={type}
                        href={tabHref(type)}
                        className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                          isActive
                            ? "border-primary-600 text-primary-700"
                            : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                        }`}
                      >
                        <span aria-hidden="true">{m.icon}</span>
                        {tTypes(type)}
                        <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                          {facets[type]}
                        </span>
                      </Link>
                    );
                  })}
              </nav>
            </div>
          </div>
        )}

        <section className="bg-gray-50 min-h-[60vh] py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {isEmpty && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4" aria-hidden="true">🔎</div>
                <p className="text-gray-500 text-base">{t("emptyPrompt")}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {(Object.entries(TYPE_META) as [ResultType, (typeof TYPE_META)[ResultType]][]).map(([type, m]) => (
                    <span key={type} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${m.color}`}>
                      <span aria-hidden="true">{m.icon}</span> {tTypes(type)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {noResults && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4" aria-hidden="true">😶</div>
                <p className="text-gray-700 font-semibold text-lg">{t("noResultsTitle", { query: q })}</p>
                <p className="text-gray-500 text-sm mt-1">{t("noResultsHint")}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {BROWSE_LINKS.map(([href, label]) => (
                    <Link key={href} href={href} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:border-primary-300 hover:text-primary-700 transition-colors">
                      {label} →
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {allResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-5 text-sm">
                  <span className="font-bold text-gray-700">
                    {t("resultCount", { count: results.length })}
                    {activeType ? ` · ${tTypes(activeType)}` : ""}
                  </span>
                  <span className="text-gray-500">{t("forQuery", { query: q })}</span>
                  <span className="text-xs text-gray-400">{t("ranked")}</span>
                </div>

                {activeType ? (
                  <div className="space-y-2">
                    {results.map((r) => (
                      <ResultCard key={`${r.type}/${r.slug}`} result={r} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {(Object.keys(TYPE_META) as ResultType[]).map((type) => {
                      const group = results.filter((r) => r.type === type);
                      if (!group.length) return null;
                      const m = TYPE_META[type];
                      return (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg" aria-hidden="true">{m.icon}</span>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{tTypes(type)}</h2>
                            <span className="text-xs text-gray-500">({group.length})</span>
                            {group.length > 3 && (
                              <Link href={tabHref(type)} className="ml-auto text-xs font-semibold text-primary-600 hover:underline">
                                {t("seeAll", { count: group.length })}
                              </Link>
                            )}
                          </div>
                          <div className="space-y-2">
                            {group.slice(0, activeType ? undefined : 5).map((r) => (
                              <ResultCard key={`${r.type}/${r.slug}`} result={r} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ResultCard({ result: r }: { result: SearchHit }) {
  const m = TYPE_META[r.type as ResultType] ?? {
    color: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Link
      href={r.href}
      className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-primary-200 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors">
            {r.title}
          </span>
          {r.badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.color} shrink-0`}>
              {r.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{r.summary}</p>
      </div>
      <span className="text-primary-400 text-sm font-bold shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">→</span>
    </Link>
  );
}
