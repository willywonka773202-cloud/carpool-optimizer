"use client";

import { ArrowDownUp } from "lucide-react";
import { LocationInput } from "@/components/LocationInput";
import { UseLocationButton } from "@/components/UseLocationButton";
import type { Coord } from "@/lib/orsTypes";
import type { Suggestion } from "@/lib/orsAutocomplete";

/**
 * Shared start/end/round-trip/swap/GPS block used by BOTH the desktop form and the
 * mobile BUILD stage. It is intentionally "dumb": every handler (including the delicate
 * startCoord-reset and end-mirrors-start logic) lives in page.tsx and is passed in
 * verbatim, so there is exactly one source of truth for trip-input behavior.
 */
export function TripFields({
  start,
  end,
  startCoord,
  endSameAsStart,
  apiKey,
  disabled,
  density = "default",
  onStartChange,
  onStartPreview,
  onStartPick,
  onEndChange,
  onEndPreview,
  onEndPick,
  onToggleRoundTrip,
  onSwap,
  onUseLocation,
  onLocationError,
}: {
  start: string;
  end: string;
  startCoord: Coord | null;
  endSameAsStart: boolean;
  apiKey: string | null;
  disabled?: boolean;
  density?: "default" | "compact";
  onStartChange: (value: string) => void;
  onStartPreview: (coord: Coord | null) => void;
  onStartPick: (suggestion: Suggestion) => void;
  onEndChange: (value: string) => void;
  onEndPreview: (coord: Coord | null) => void;
  onEndPick: (suggestion: Suggestion) => void;
  onToggleRoundTrip: (checked: boolean) => void;
  onSwap: () => void;
  onUseLocation: (coord: Coord) => void;
  onLocationError: (message: string) => void;
}) {
  const compact = density === "compact";

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col gap-2" : "space-y-2"}>
      <LocationInput
        label="Start"
        value={start}
        iconTone="emerald"
        apiKey={apiKey}
        density={density}
        onChange={onStartChange}
        onPreview={onStartPreview}
        onPick={onStartPick}
        disabled={disabled}
      />
      <LocationInput
        label="End"
        value={end}
        iconTone="red"
        apiKey={apiKey}
        density={density}
        onChange={onEndChange}
        onPreview={onEndPreview}
        onPick={onEndPick}
        disabled={disabled || endSameAsStart}
      />

      {compact ? (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-50">
              <input
                type="checkbox"
                checked={endSameAsStart}
                onChange={(e) => onToggleRoundTrip(e.target.checked)}
                disabled={disabled}
                className="h-3.5 w-3.5 rounded border-cyan-300/40 bg-slate-950/60 text-cyan-400 focus:ring-cyan-400/40"
              />
              <span className="truncate">Round trip</span>
            </label>
            <button
              type="button"
              onClick={onSwap}
              disabled={disabled || (!start && !end)}
              aria-label="Swap start and end"
              className="flex h-9 w-10 items-center justify-center rounded-lg text-slate-200 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <UseLocationButton
              onLocate={onUseLocation}
              onError={onLocationError}
              disabled={disabled}
            />
            {startCoord && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
                GPS set
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-50 transition hover:bg-cyan-400/15">
            <span className="inline-flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={endSameAsStart}
                onChange={(e) => onToggleRoundTrip(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-cyan-300/40 bg-slate-950/60 text-cyan-400 focus:ring-cyan-400/40"
              />
              End at start
            </span>
            <span className="text-[11px] text-cyan-100/80">round trip</span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UseLocationButton
                onLocate={onUseLocation}
                onError={onLocationError}
                disabled={disabled}
              />
              {startCoord && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
                  GPS start
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSwap}
              disabled={disabled || (!start && !end)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <ArrowDownUp className="h-3 w-3" aria-hidden="true" /> Swap
            </button>
          </div>
        </>
      )}
      {compact && (
        <p className="mt-auto pb-1 text-[11px] leading-4 text-slate-500">
          Add drop-offs in the <span className="font-semibold text-slate-300">Stops</span> tab,
          then tap <span className="font-semibold text-cyan-200">Plan</span>. The person icon
          (top-right) saves Home &amp; rider groups.
        </p>
      )}
    </div>
  );
}
