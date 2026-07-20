// ============================================================
// Analytics data service — admin metrics from the Laravel API.
// ============================================================
import { apiGet } from "@/lib/api/client";

export interface Analytics {
  content: Record<string, { total: number; published: number }>;
  workflow: Record<string, number>;
  projectsByRegion: Record<string, number>;
  projectsByStatus: Record<string, number>;
  submissions: Record<string, number>;
  contentByTheme: Record<string, number>;
  users: { total: number; pending: number; partners: number };
  totals: {
    contentItems: number;
    published: number;
    pendingReview: number;
    submissions: number;
  };
}

const EMPTY: Analytics = {
  content: {},
  workflow: {},
  projectsByRegion: {},
  projectsByStatus: {},
  submissions: {},
  contentByTheme: {},
  users: { total: 0, pending: 0, partners: 0 },
  totals: { contentItems: 0, published: 0, pendingReview: 0, submissions: 0 },
};

export async function getAnalytics(token?: string): Promise<Analytics> {
  return apiGet<Analytics>("analytics/overview", EMPTY, { token });
}

export const EXPORT_DATASETS = [
  "projects",
  "technologies",
  "partners",
  "resources",
  "events",
  "opportunities",
] as const;
