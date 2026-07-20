import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Agri-Energy",
  description:
    "Learn about agri-energy in Uganda — what it is, why it matters, and how this platform supports the sector.",
};

const focusAreas = [
  {
    icon: "💧",
    title: "Solar-Powered Irrigation",
    desc: "Replacing diesel pumps and rain dependence with reliable solar water pumping systems.",
  },
  {
    icon: "🧊",
    title: "Cold Chain & Storage",
    desc: "Solar cold rooms and refrigeration to reduce post-harvest losses in dairy, horticulture, and fish.",
  },
  {
    icon: "⚙️",
    title: "Agro-Processing",
    desc: "Solar-powered milling, drying, and processing equipment to add value to agricultural produce.",
  },
  {
    icon: "🔥",
    title: "Clean Cooking",
    desc: "Biogas digesters and improved biomass systems reducing firewood use and indoor air pollution.",
  },
  {
    icon: "💡",
    title: "Productive Use of Energy",
    desc: "Applying renewable energy directly to income-generating agricultural activities.",
  },
  {
    icon: "🌱",
    title: "Climate Resilience",
    desc: "Energy-enabled adaptation strategies that help farmers cope with climate variability.",
  },
];

const userGroups = [
  { icon: "👩‍🌾", label: "Farmers & Farmer Organisations", desc: "Access technology information, find solutions, and explore examples of agri-energy in practice." },
  { icon: "🏛️", label: "Government Planners", desc: "Geographic project visibility, sector data, and implementation trends for coordination." },
  { icon: "🌍", label: "Development Partners & Donors", desc: "Understand existing interventions, target areas, and opportunities for support." },
  { icon: "🏢", label: "Implementing Partners", desc: "Profile your work, submit project information, and keep your records updated." },
  { icon: "📊", label: "Researchers & Analysts", desc: "Access structured records, case studies, and curated resources." },
  { icon: "💼", label: "Private Sector", desc: "Market visibility, technology relevance, and partnership opportunities." },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Page header */}
        <section className="bg-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">About the Platform</div>
              <h1 className="text-4xl font-extrabold mb-4">About Agri-Energy</h1>
              <p className="text-green-200 text-lg leading-relaxed">
                Understanding how energy supports agriculture in Uganda — and why a national digital platform matters.
              </p>
            </div>
          </div>
        </section>

        {/* What is agri-energy */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">What is Agri-Energy?</h2>
                <div className="space-y-4 text-gray-600 leading-relaxed">
                  <p>Agri-energy refers to the application of energy — particularly renewable energy — to agricultural production, processing, storage, and value addition. It encompasses technologies and practices that use solar, biogas, and other clean energy sources to power irrigation systems, food processing equipment, cold chain infrastructure, and farm machinery.</p>
                  <p>In Uganda, agri-energy plays a critical role in transforming subsistence agriculture into productive commercial activity. By replacing diesel fuel and removing dependence on rain-fed production, agri-energy technologies help farmers achieve higher yields, reduce losses, extend marketing windows, and ultimately increase their incomes.</p>
                  <p>The Agri-Energy Desk documents, organises, and makes accessible the full landscape of agri-energy technologies, projects, and knowledge resources from across Uganda.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {focusAreas.slice(0, 4).map((area) => (
                  <div key={area.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl mb-2">{area.icon}</div>
                    <div className="font-semibold text-gray-800 text-sm mb-1">{area.title}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{area.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why the Agri-Energy Desk matters */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why the Agri-Energy Desk matters</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: "📦",
                  title: "Fragmented Information",
                  desc: "Information on agri-energy interventions in Uganda is scattered across organisations, reports, and websites — difficult for any stakeholder to navigate effectively.",
                },
                {
                  icon: "🔍",
                  title: "Limited Visibility",
                  desc: "There is no single space where users can identify who is implementing what, where, using which technologies, and for which beneficiary groups.",
                },
                {
                  icon: "📈",
                  title: "Evidence Gap",
                  desc: "A growing need for evidence to support planning, investment, and coordination requires structured data and curated knowledge resources.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform features */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">How to Use This Platform</h2>
            <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">The Agri-Energy Desk is organised into several interconnected modules, each serving a specific purpose.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { href: "/projects", icon: "🏗️", label: "Project Database", desc: "Search and filter agri-energy projects by district, technology, value chain, partner, and status." },
                { href: "/technologies", icon: "⚡", label: "Technologies Library", desc: "Deep-dive reference pages on specific agri-energy technologies including applications, benefits, and maintenance." },
                { href: "/themes", icon: "📚", label: "Thematic Hub", desc: "Browse agri-energy knowledge organised by cross-cutting themes such as financing, gender, and climate." },
                { href: "/partners", icon: "🤝", label: "Partners Directory", desc: "Find organisations active in agri-energy across Uganda — government, NGOs, private sector, and research." },
                { href: "/resources", icon: "📄", label: "Resources Library", desc: "Access reports, guides, policy briefs, case studies, and datasets relevant to agri-energy." },
                { href: "/map", icon: "🗺️", label: "Geographic Map", desc: "Explore where agri-energy projects are located across Uganda's districts and regions." },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="card p-5 group flex gap-4">
                  <div className="text-2xl shrink-0">{item.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm group-hover:text-primary-700 transition-colors">{item.label}</div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Who the platform serves */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Who This Platform Serves</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {userGroups.map((g) => (
                <div key={g.label} className="flex gap-4 bg-white rounded-xl p-5 border border-gray-100 shadow-card">
                  <div className="text-2xl shrink-0">{g.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm mb-1">{g.label}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Managed by NREP */}
        <section className="py-14 bg-primary-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Managed by NREP</h2>
            <p className="text-green-200 max-w-2xl mx-auto mb-6 leading-relaxed">
              The Agri-Energy Desk is owned and managed by the National Renewable Energy Platform (NREP) Secretariat as Uganda&apos;s steward of renewable energy knowledge and coordination.
            </p>
            <Link href="/contact" className="inline-flex items-center px-6 py-3 bg-white text-primary-800 font-bold rounded-xl hover:bg-primary-50 transition-colors">
              Contact NREP →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
