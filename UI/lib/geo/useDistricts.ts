"use client";
// ============================================================
// useDistrictNames — every Uganda district, for filter inputs.
//
// The names come from the bundled ADM2 boundary file via
// fetchDistrictMeta (151 districts, sessionStorage-cached for 7 days), so
// this needs no network call after the first page that asks for it.
//
// It exists because the public filters used to be bare text boxes: you
// had to already know a district's exact spelling to filter by it, and
// nothing told you which ones the platform recognises.
// ============================================================
import { useEffect, useState } from "react";
import { fetchDistrictMeta } from "@/lib/geo/ugandaGeo";

/** Sorted district names. Empty until the boundary file has parsed. */
export function useDistrictNames(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    fetchDistrictMeta()
      .then((meta) => {
        if (!alive) return;
        setNames(
          [...new Set(meta.map((d) => d.name))].sort((a, b) => a.localeCompare(b))
        );
      })
      // A filter that cannot offer suggestions still accepts typed input,
      // so a boundary-file failure must not break the page.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return names;
}
