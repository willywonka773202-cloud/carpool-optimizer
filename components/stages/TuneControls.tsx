"use client";

import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { RideDetailsPanel } from "@/components/RideDetailsPanel";
import { RideReadinessPanel } from "@/components/RideReadinessPanel";
import { RoutePreferencesPanel } from "@/components/RoutePreferencesPanel";
import { getRideReadiness } from "@/lib/rideReadiness";
import type { RidePlan, RoutePreferences } from "@/lib/types";

type Props = {
  routePreferences: RoutePreferences;
  onRoutePreferencesChange: (next: RoutePreferences) => void;
  ridePlan: RidePlan;
  onRidePlanChange: (next: RidePlan) => void;
  start: string;
  end: string;
  stops: string[];
  riderNames: (string | null)[];
  disabled?: boolean;
  compact?: boolean;
  /** Only used in compact mode: controls the "More options" accordion. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
};

/**
 * The TUNE stage controls: route preferences + ride plan + readiness.
 * Desktop renders the full panels stacked. Mobile renders a condensed essentials grid
 * plus a one-line readiness strip, with the full panels behind a "More options" accordion
 * (collapsed by default so TUNE fits with no scroll in the common case).
 */
export function TuneControls({
  routePreferences,
  onRoutePreferencesChange,
  ridePlan,
  onRidePlanChange,
  start,
  end,
  stops,
  riderNames,
  disabled,
  compact = false,
  expanded = false,
  onToggleExpanded,
}: Props) {
  if (!compact) {
    return (
      <div className="space-y-4">
        <RoutePreferencesPanel
          value={routePreferences}
          onChange={onRoutePreferencesChange}
          disabled={disabled}
        />
        <RideDetailsPanel value={ridePlan} onChange={onRidePlanChange} disabled={disabled} />
        <RideReadinessPanel
          start={start}
          end={end}
          stops={stops}
          riderNames={riderNames}
          ridePlan={ridePlan}
        />
      </div>
    );
  }

  const readiness = getRideReadiness({ start, end, stops, riderNames, ridePlan });
  const toneClass =
    readiness.status === "ready"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : readiness.status === "attention"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
        : "border-white/10 bg-slate-950/40 text-slate-300";
  const readinessLabel =
    readiness.status === "ready"
      ? "Ready to plan"
      : readiness.status === "attention"
        ? "Needs attention"
        : "Draft";

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-2">
      {/* Row 1: condensed essentials (collapsed) OR a pinned hide toggle (expanded) so the
          expanded panels get the full body instead of a squished sliver. */}
      {expanded ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950/35 text-xs font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-900/60"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Hide options
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Route</span>
            <select
              value={routePreferences.intent}
              disabled={disabled}
              onChange={(e) =>
                onRoutePreferencesChange({
                  ...routePreferences,
                  intent: e.target.value as RoutePreferences["intent"],
                })
              }
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-950/45 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-50"
            >
              <option value="fastest">Fastest</option>
              <option value="balanced">Balanced</option>
              <option value="alternate">Alternate</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Seats</span>
            <input
              type="number"
              min={1}
              max={8}
              value={ridePlan.seatsAvailable}
              disabled={disabled}
              onChange={(e) =>
                onRidePlanChange({
                  ...ridePlan,
                  seatsAvailable: Math.min(8, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-950/45 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Date</span>
            <input
              type="date"
              value={ridePlan.rideDate}
              disabled={disabled}
              onChange={(e) => onRidePlanChange({ ...ridePlan, rideDate: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-950/45 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Arrive</span>
            <input
              type="time"
              value={ridePlan.arrivalTime}
              disabled={disabled}
              onChange={(e) => onRidePlanChange({ ...ridePlan, arrivalTime: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-950/45 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-50"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["avoidTolls", "No tolls"],
            ["avoidHighways", "No highways"],
          ] as const).map(([key, label]) => {
            const active = routePreferences[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() =>
                  onRoutePreferencesChange({ ...routePreferences, [key]: !routePreferences[key] })
                }
                className={
                  "h-9 rounded-lg text-xs font-bold ring-1 transition disabled:opacity-50 " +
                  (active
                    ? "bg-cyan-300/20 text-cyan-50 ring-cyan-200/30"
                    : "bg-slate-950/35 text-slate-400 ring-white/10 hover:text-slate-100")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <div
          className={"flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold " + toneClass}
        >
          <span className="truncate">{readinessLabel}</span>
          <span className="shrink-0 font-medium opacity-90">
            {readiness.totalStops} stop{readiness.totalStops === 1 ? "" : "s"} ·{" "}
            {Math.min(readiness.totalStops, ridePlan.seatsAvailable)}/{ridePlan.seatsAvailable} seats
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950/35 text-xs font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-900/60"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          More options (note, checklist, repeat, reminder)
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      )}

      {/* Row 2: the single sanctioned scroll region in TUNE — gets the full body when expanded. */}
      {expanded ? (
        <div className="min-h-0 space-y-3 overflow-y-auto pb-2">
          <RideDetailsPanel value={ridePlan} onChange={onRidePlanChange} disabled={disabled} />
          <RoutePreferencesPanel
            value={routePreferences}
            onChange={onRoutePreferencesChange}
            disabled={disabled}
          />
          <RideReadinessPanel
            start={start}
            end={end}
            stops={stops}
            riderNames={riderNames}
            ridePlan={ridePlan}
          />
        </div>
      ) : (
        <div className="min-h-0" />
      )}
    </div>
  );
}
