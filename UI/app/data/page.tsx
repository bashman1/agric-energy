import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import EmptyState from "@/components/shared/EmptyState";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getRegionStats,
  OPEN_DATA_DOWNLOADS,
  PUBLIC_API_URL,
} from "@/lib/data/open-data";

export const metadata: Metadata = {
  title: "Open Data & Downloads — Agri-Energy Desk",
  description:
    "Download the Agri-Energy Desk project dataset as CSV or GeoJSON, and browse regional aggregates for Uganda's agri-energy projects.",
};

function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function fmtBudget(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function OpenDataPage() {
  const regions = await getRegionStats();

  const totals = regions.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      totalBudget: acc.totalBudget + r.totalBudget,
      beneficiaries: acc.beneficiaries + r.beneficiaries,
    }),
    { count: 0, totalBudget: 0, beneficiaries: 0 }
  );

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              Open Data
            </div>
            <h1 className="text-3xl font-extrabold mb-3">
              Open Data &amp; Downloads
            </h1>
            <p className="text-primary-100 max-w-2xl">
              The Agri-Energy Desk publishes its project register as open,
              machine-readable data. Download the full dataset, or explore the
              regional aggregates below.
            </p>
          </div>
        </section>

        {/* ── Datasets ─────────────────────────────────────── */}
        <section className="bg-gray-50 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Available datasets
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Both files cover every <strong>published</strong> project on the
              platform and are regenerated on each request, so a download is
              always current. Unpublished and draft records are never included.
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              {OPEN_DATA_DOWNLOADS.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-xl border border-gray-100 p-6 shadow-card flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl" aria-hidden="true">
                      {d.icon}
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-snug">
                        {d.label}
                      </h3>
                      <span className="text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                        {d.format}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">
                    {d.description}
                  </p>
                  <a
                    href={d.href}
                    download
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors text-sm"
                  >
                    Download {d.format}
                    <span className="sr-only"> — {d.label}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Regional aggregates ──────────────────────────── */}
        <section className="bg-white py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Projects by region
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Aggregated counts, committed budget and reported beneficiaries for
              published projects, grouped by region. These are the same figures
              that shade the{" "}
              <Link href="/map" className="text-primary-700 font-semibold hover:underline">
                project map
              </Link>
              .
            </p>

            {regions.length === 0 ? (
              <EmptyState
                icon="📈"
                title="No regional data yet"
                message="Regional aggregates will appear once projects with a region are published."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Published agri-energy projects by region, with project
                    count, total budget and reported beneficiaries
                  </caption>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="text-left font-semibold text-gray-600 px-4 py-3">
                        Region
                      </th>
                      <th scope="col" className="text-right font-semibold text-gray-600 px-4 py-3">
                        Projects
                      </th>
                      <th scope="col" className="text-right font-semibold text-gray-600 px-4 py-3">
                        Total budget
                      </th>
                      <th scope="col" className="text-right font-semibold text-gray-600 px-4 py-3">
                        Beneficiaries
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {regions.map((r) => (
                      <tr key={r.region} className="hover:bg-gray-50">
                        <th scope="row" className="text-left font-medium text-gray-900 px-4 py-3">
                          {r.region}
                        </th>
                        <td className="text-right text-gray-700 px-4 py-3 tabular-nums">
                          {fmtNumber(r.count)}
                        </td>
                        <td className="text-right text-gray-700 px-4 py-3 tabular-nums">
                          {fmtBudget(r.totalBudget)}
                        </td>
                        <td className="text-right text-gray-700 px-4 py-3 tabular-nums">
                          {r.beneficiaries ? fmtNumber(r.beneficiaries) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-900">
                    <tr>
                      <th scope="row" className="text-left px-4 py-3">
                        All regions
                      </th>
                      <td className="text-right px-4 py-3 tabular-nums">
                        {fmtNumber(totals.count)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums">
                        {fmtBudget(totals.totalBudget)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums">
                        {totals.beneficiaries ? fmtNumber(totals.beneficiaries) : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Budget figures are summed across the currencies recorded on each
              project and are indicative only. Beneficiary counts are as reported
              by implementing partners.
            </p>
          </div>
        </section>

        {/* ── Using the data ───────────────────────────────── */}
        <section className="bg-gray-50 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                <h2 className="font-bold text-gray-900 mb-3">
                  Licence &amp; attribution
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  These datasets are published as open data for research,
                  planning, journalism and programme design. You are free to
                  reuse and redistribute them, provided you attribute the
                  Agri-Energy Desk and state the date of download.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  If you spot an error or have data to contribute, please{" "}
                  <Link href="/contact" className="text-primary-700 font-semibold hover:underline">
                    get in touch
                  </Link>
                  .
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                <h2 className="font-bold text-gray-900 mb-3">Programmatic access</h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Everything on this platform is served by a public read-only
                  REST API. The open-data endpoints are:
                </p>
                <ul className="space-y-2 text-xs text-gray-700 list-none p-0 m-0">
                  {[
                    "open-data/projects.csv",
                    "open-data/projects.geojson",
                    "open-data/regions",
                  ].map((path) => (
                    <li key={path}>
                      <code className="block bg-gray-50 border border-gray-200 rounded px-2 py-1.5 break-all">
                        GET {PUBLIC_API_URL}/{path}
                      </code>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 leading-relaxed mt-4">
                  For bulk access, higher rate limits or a custom extract,{" "}
                  <Link href="/contact" className="text-primary-700 font-semibold hover:underline">
                    contact the Desk team
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
