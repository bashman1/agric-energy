import { getSiteConfig } from "@/lib/data/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Site Configuration" };

export default async function AdminSiteConfigPage() {
  const config = await getSiteConfig();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Site Configuration</h1>
        <p className="text-sm text-ink-500 mt-0.5">Manage homepage hero, stats, and featured content.</p>
      </div>

      {/* Hero section */}
      <div className="bg-white rounded-xl border border-ink-200 p-6 mb-5 shadow-card">
        <h2 className="font-bold text-ink-900 text-sm mb-4">Homepage Hero</h2>
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Title</span>
            <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 text-sm text-ink-700">{config.hero.title}</div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Subtitle</span>
            <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 text-sm text-ink-700">{config.hero.subtitle}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">CTA Label</span>
              <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 text-sm text-ink-700">{config.hero.ctaLabel}</div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">CTA URL</span>
              <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 text-sm text-ink-700">{config.hero.ctaUrl}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-ink-200 p-6 mb-5 shadow-card">
        <h2 className="font-bold text-ink-900 text-sm mb-4">Homepage Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(config.stats).map(([key, val]) => (
            <div key={key}>
              <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">{key}</span>
              <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 text-lg font-bold text-ink-800">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700 font-semibold mb-1">Read-Only in Prototype</p>
        <p className="text-xs text-amber-600 leading-relaxed">
          Site config editing via the UI will be enabled in Phase 2. For now, edit <code className="font-mono">data/site/config.json</code> directly to change these values. Changes take effect on next server restart.
        </p>
      </div>
    </div>
  );
}
