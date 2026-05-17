"use client";

import { Clock, Copy, Navigation, Pencil, Save } from "lucide-react";
import { useState } from "react";
import type { OptimizedRoute } from "@/lib/types";
import { buildGoogleMapsUrl } from "@/lib/routeUrl";

function formatEta(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

function formatMiles(meters: number): string {
  const mi = meters / 1609.34;
  return `${mi.toFixed(1)} mi`;
}

export function RouteSummary({
  start,
  end,
  optimized,
  onEdit,
  onSave,
}: {
  start: string;
  end: string;
  optimized: OptimizedRoute;
  onEdit: () => void;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFallbackVisible, setCopyFallbackVisible] = useState(false);
  const url = buildGoogleMapsUrl({ start, end, orderedStops: optimized.orderedStops });

  async function copy() {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFallbackVisible(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyFallbackVisible(true);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" /> {formatEta(optimized.etaSeconds)}
        </span>
        <span>•</span>
        <span>{formatMiles(optimized.distanceMeters)}</span>
        <span>•</span>
        <span>{optimized.orderedStops.length} stops</span>
      </div>

      <ol className="space-y-1 text-sm">
        <li className="flex gap-2"><span className="font-semibold text-emerald-700">S</span> {start}</li>
        {optimized.orderedStops.map((s, i) => (
          <li key={`${s}-${i}`} className="flex gap-2"><span className="font-semibold text-slate-700">{i + 1}.</span> {s}</li>
        ))}
        <li className="flex gap-2"><span className="font-semibold text-red-700">E</span> {end}</li>
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <Navigation className="h-4 w-4" /> Open in Maps
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" /> Edit stops
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Save className="h-4 w-4" /> Save route
        </button>
      </div>

      {copyFallbackVisible && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Copy blocked in this environment — select and copy manually:
          </p>
          <textarea
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-slate-400"
          />
        </div>
      )}

      {optimized.source === "mock" && (
        <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          Mock mode: stop order is a deterministic placeholder. Add a Google Maps API key for real optimization.
        </p>
      )}
    </div>
  );
}
