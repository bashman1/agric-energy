"use client";
import { useState, useEffect, useCallback, useRef, useId } from "react";
import { fetchDistrictMeta, type DistrictMeta } from "@/lib/geo/ugandaGeo";

// ── Value interface — AdminProjectForm passes this in ─────────────────────────
export interface LocationValue {
  regions:      string[];   // ADM1 — multiple regions allowed
  districts:    string[];   // ADM2 — multiple districts allowed
  lat:          number | "";
  lng:          number | "";
  locationNote: string;
  // Legacy scalar fields kept for backward compatibility on save
  region:   string;
  district: string;
}

interface Props {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
}

const ALL_REGIONS = ["Central Uganda", "Eastern Uganda", "Northern Uganda", "Western Uganda"];

/** Auto-geocode using Nominatim — returns center of the first result */
async function geoCenter(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${query}, Uganda`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ug`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

// ── Chip / tag component ──────────────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-1 rounded-full border border-primary-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-primary-400 hover:text-primary-700 font-bold leading-none ml-0.5"
        title={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

// ── Searchable multi-select dropdown ─────────────────────────────────────────
interface MultiDropdownProps {
  placeholder:    string;
  options:        string[];
  selected:       string[];
  onAdd:          (val: string) => void;
  loading?:       boolean;
  disabled?:      boolean;
  inputId?:       string;
}
function MultiDropdown({ placeholder, options, selected, onAdd, loading, disabled, inputId }: MultiDropdownProps) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options
    .filter((o) => !selected.includes(o))
    .filter((o) => !search || o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div
        role="presentation"
        className={`form-input flex items-center gap-2 cursor-pointer ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <input
          id={inputId}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          placeholder={loading ? "Loading from OpenStreetMap…" : placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-ink-700 placeholder:text-ink-400"
          onClick={(e) => e.stopPropagation()}
        />
        {loading && <div className="w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin shrink-0" />}
        {!loading && (
          <svg className={`w-3.5 h-3.5 text-ink-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.09 1.03l-4.25 4.5a.75.75 0 01-1.09 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {open && (
        <ul className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-ink-200 rounded-xl shadow-xl max-h-52 overflow-y-auto text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-ink-400 text-xs">
              {selected.length && !search ? "All options selected" : "No matches found"}
            </li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-primary-50 cursor-pointer text-ink-800 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); onAdd(opt); setSearch(""); setOpen(false); }}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function LocationPicker({ value, onChange }: Props) {
  const [allDistricts,    setAllDistricts]    = useState<DistrictMeta[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [districtError,   setDistrictError]   = useState<string | null>(null);
  const [geocoding,       setGeocoding]       = useState(false);
  const uid = useId();

  useEffect(() => {
    fetchDistrictMeta()
      .then((d) => { setAllDistricts(d); setLoadingDistricts(false); })
      .catch(() => { setDistrictError("Could not load districts (check connection)."); setLoadingDistricts(false); });
  }, []);

  // Districts available for selection: filtered by selected regions (if any)
  const availableDistricts = (value.regions.length > 0
    ? allDistricts.filter((d) => value.regions.includes(d.region))
    : allDistricts
  ).map((d) => d.name);

  // ── Add / remove handlers ────────────────────────────────────────────────
  const addRegion = useCallback((region: string) => {
    if (value.regions.includes(region)) return;
    const newRegions = [...value.regions, region];
    // Drop districts that no longer belong to any selected region
    const newDistricts = value.districts.filter((d) => {
      const meta = allDistricts.find((m) => m.name === d);
      return !meta || newRegions.includes(meta.region);
    });
    onChange({ ...value, regions: newRegions, districts: newDistricts, region: newRegions[0] ?? "", district: newDistricts[0] ?? "" });
  }, [value, onChange, allDistricts]);

  const removeRegion = useCallback((region: string) => {
    const newRegions = value.regions.filter((r) => r !== region);
    const newDistricts = value.districts.filter((d) => {
      const meta = allDistricts.find((m) => m.name === d);
      return !meta || newRegions.includes(meta.region);
    });
    onChange({ ...value, regions: newRegions, districts: newDistricts, region: newRegions[0] ?? "", district: newDistricts[0] ?? "" });
  }, [value, onChange, allDistricts]);

  const addDistrict = useCallback(async (district: string) => {
    if (value.districts.includes(district)) return;
    const newDistricts = [...value.districts, district];
    // Auto-geocode the first district (for the map marker)
    let lat: number | "" = value.lat;
    let lng: number | "" = value.lng;
    if (newDistricts.length === 1 || (value.lat === "" && value.lng === "")) {
      setGeocoding(true);
      const coords = await geoCenter(district);
      setGeocoding(false);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }
    onChange({ ...value, districts: newDistricts, district: newDistricts[0] ?? "", lat, lng });
  }, [value, onChange]);

  const removeDistrict = useCallback((district: string) => {
    const newDistricts = value.districts.filter((d) => d !== district);
    onChange({ ...value, districts: newDistricts, district: newDistricts[0] ?? "" });
  }, [value, onChange]);

  const clearAll = useCallback(() => {
    onChange({ regions: [], districts: [], lat: "", lng: "", locationNote: "", region: "", district: "" });
  }, [onChange]);

  const hasValue = value.regions.length > 0 || value.districts.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Regions (ADM1) ── */}
      <div>
        <label htmlFor={`${uid}-regions`} className="block text-xs font-semibold text-ink-600 mb-1.5">
          Regions <span className="font-normal text-ink-400">(ADM1 · select all that apply)</span>
        </label>
        <MultiDropdown
          inputId={`${uid}-regions`}
          placeholder="Add a region…"
          options={ALL_REGIONS}
          selected={value.regions}
          onAdd={addRegion}
        />
        {value.regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {value.regions.map((r) => (
              <Chip key={r} label={r} onRemove={() => removeRegion(r)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Districts (ADM2) ── */}
      <div>
        <label htmlFor={`${uid}-districts`} className="block text-xs font-semibold text-ink-600 mb-1.5">
          Districts <span className="font-normal text-ink-400">(ADM2 · OpenStreetMap live data)</span>
        </label>
        {districtError ? (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{districtError}</p>
        ) : (
          <MultiDropdown
            inputId={`${uid}-districts`}
            placeholder={loadingDistricts ? "Loading from OpenStreetMap…" : (value.regions.length ? "Add a district from selected regions…" : "Add a district…")}
            options={availableDistricts}
            selected={value.districts}
            onAdd={addDistrict}
            loading={loadingDistricts}
            disabled={loadingDistricts}
          />
        )}
        {geocoding && <p className="text-[10px] text-primary-500 mt-0.5">Fetching coordinates for map marker…</p>}
        {value.districts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {value.districts.map((d) => (
              <Chip key={d} label={d} onRemove={() => removeDistrict(d)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Summary card ── */}
      {hasValue && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-primary-800 mb-1.5">Coverage</div>
            <div className="text-xs text-primary-700 space-y-0.5">
              {value.regions.length > 0 && (
                <div><span className="font-semibold">{value.regions.length} region{value.regions.length > 1 ? "s" : ""}:</span> {value.regions.join(", ")}</div>
              )}
              {value.districts.length > 0 && (
                <div><span className="font-semibold">{value.districts.length} district{value.districts.length > 1 ? "s" : ""}:</span> {value.districts.join(", ")}</div>
              )}
              {value.lat !== "" && value.lng !== "" && (
                <div className="font-mono text-[10px] text-ink-500 mt-0.5">
                  {Number(value.lat).toFixed(4)}°, {Number(value.lng).toFixed(4)}° (map marker)
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={clearAll}
            className="text-primary-400 hover:text-primary-600 text-sm shrink-0 mt-0.5" title="Clear all">
            ✕
          </button>
        </div>
      )}

      {/* ── Coordinate overrides ── */}
      <div>
        <div className="text-xs font-semibold text-ink-600 mb-1.5">
          Map Marker Coordinates <span className="font-normal text-ink-400">(auto-filled from first district)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-lat`} className="block text-[10px] text-ink-500 mb-1">Latitude</label>
            <input id={`${uid}-lat`} type="number" step="0.0001" value={value.lat}
              onChange={(e) => onChange({ ...value, lat: e.target.value ? parseFloat(e.target.value) : "" })}
              placeholder="e.g. 2.7747" className="form-input text-sm font-mono" />
          </div>
          <div>
            <label htmlFor={`${uid}-lng`} className="block text-[10px] text-ink-500 mb-1">Longitude</label>
            <input id={`${uid}-lng`} type="number" step="0.0001" value={value.lng}
              onChange={(e) => onChange({ ...value, lng: e.target.value ? parseFloat(e.target.value) : "" })}
              placeholder="e.g. 32.2990" className="form-input text-sm font-mono" />
          </div>
        </div>
      </div>

      {/* ── Location note ── */}
      <div>
        <label htmlFor={`${uid}-note`} className="block text-xs font-semibold text-ink-600 mb-1">
          Location Note <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <input id={`${uid}-note`} type="text" value={value.locationNote}
          onChange={(e) => onChange({ ...value, locationNote: e.target.value })}
          placeholder="e.g. Covers Gulu and Amuru sub-counties in Northern Uganda"
          className="form-input text-sm" />
      </div>
    </div>
  );
}
