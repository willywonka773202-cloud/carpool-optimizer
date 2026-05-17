"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { ArrowDownUp, RotateCcw, Sparkles } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LocationInput } from "@/components/LocationInput";
import { WaypointList } from "@/components/WaypointList";
import { MapView } from "@/components/MapView";
import { RouteSheet } from "@/components/RouteSheet";
import { RouteSummary } from "@/components/RouteSummary";
import { SavedRoutesMenu } from "@/components/SavedRoutesMenu";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { validateRouteInputs } from "@/lib/validation";
import { optimizeRoute } from "@/lib/optimizeRoute";
import { mockOptimizeRoute } from "@/lib/mockOptimizeRoute";
import { getActiveApiKey } from "@/lib/googleMaps";
import { saveRoute } from "@/lib/storage";
import {
  duplicateItem,
  moveItemDown,
  moveItemUp,
  removeItem,
} from "@/lib/waypointOps";
import type {
  OptimizationMode,
  OptimizedRoute,
  RouteInputs,
  SavedRoute,
} from "@/lib/types";

type Phase =
  | { kind: "editing"; error?: string }
  | { kind: "optimizing" }
  | { kind: "optimized"; result: OptimizedRoute };

type Action =
  | { type: "edit_changed" }
  | { type: "validation_failed"; message: string }
  | { type: "optimize_start" }
  | { type: "optimize_success"; result: OptimizedRoute }
  | { type: "optimize_error"; message: string }
  | { type: "back_to_edit" }
  | { type: "reset" };

function phaseReducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case "edit_changed":
      if (state.kind === "editing" && state.error) {
        return { kind: "editing" };
      }
      return state;
    case "validation_failed":
      return { kind: "editing", error: action.message };
    case "optimize_start":
      return { kind: "optimizing" };
    case "optimize_success":
      return { kind: "optimized", result: action.result };
    case "optimize_error":
      return { kind: "editing", error: action.message };
    case "back_to_edit":
      return { kind: "editing" };
    case "reset":
      return { kind: "editing" };
  }
}

function resolveMode(apiKey: string | null, loadFailed: boolean): OptimizationMode {
  if (loadFailed) return "loadError";
  return apiKey ? "live" : "demo";
}

export default function Page() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapsLoadFailed, setMapsLoadFailed] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([""]);
  const [riderNames, setRiderNames] = useState<(string | null)[]>([null]);
  const [showRiderNames, setShowRiderNames] = useState(false);
  const [phase, dispatch] = useReducer(phaseReducer, { kind: "editing" });
  const [expanded, setExpanded] = useState(true);

  const toast = useToast();

  function refreshApiKey() {
    setApiKey(getActiveApiKey());
  }
  useEffect(refreshApiKey, []);

  const mode = useMemo(() => resolveMode(apiKey, mapsLoadFailed), [apiKey, mapsLoadFailed]);
  const useMock = mode !== "live";

  function ensureRidersAlignment(stops: string[], names: (string | null)[]): (string | null)[] {
    if (names.length === stops.length) return names;
    if (names.length < stops.length) {
      return [...names, ...Array<string | null>(stops.length - names.length).fill(null)];
    }
    return names.slice(0, stops.length);
  }

  function applyStops(next: string[], nextRiders?: (string | null)[]) {
    setWaypoints(next);
    setRiderNames(ensureRidersAlignment(next, nextRiders ?? riderNames));
    dispatch({ type: "edit_changed" });
  }

  function handleAddStop() {
    applyStops([...waypoints, ""], [...riderNames, null]);
  }

  function handleRemoveStop(i: number) {
    applyStops(removeItem(waypoints, i), removeItem(riderNames, i));
  }

  function handleRestoreStop(i: number, address: string, riderName?: string | null) {
    const nextStops = [...waypoints];
    nextStops.splice(i, 0, address);
    const nextRiders = [...riderNames];
    nextRiders.splice(i, 0, riderName ?? null);
    applyStops(nextStops, nextRiders);
  }

  function handleChangeStop(i: number, value: string) {
    applyStops(waypoints.map((x, idx) => (idx === i ? value : x)));
  }

  function handleChangeRider(i: number, value: string | null) {
    setRiderNames((cur) => cur.map((x, idx) => (idx === i ? value : x)));
  }

  function handleMoveUp(i: number) {
    applyStops(moveItemUp(waypoints, i), moveItemUp(riderNames, i));
  }

  function handleMoveDown(i: number) {
    applyStops(moveItemDown(waypoints, i), moveItemDown(riderNames, i));
  }

  function handleDuplicate(i: number) {
    applyStops(duplicateItem(waypoints, i), duplicateItem(riderNames, i));
  }

  function handleSwapEnds() {
    const oldStart = start;
    setStart(end);
    setEnd(oldStart);
    dispatch({ type: "edit_changed" });
  }

  async function handleOptimize() {
    if (phase.kind === "optimizing") return;
    const inputs: RouteInputs = { start, end, stops: waypoints };
    const v = validateRouteInputs({ start, end, waypoints });
    if (!v.ok) {
      dispatch({ type: "validation_failed", message: v.message });
      return;
    }
    dispatch({ type: "optimize_start" });
    try {
      const cleanInputs: RouteInputs = { start, end, stops: v.cleanedWaypoints };
      const result = useMock
        ? mockOptimizeRoute(cleanInputs)
        : await optimizeRoute(cleanInputs);
      dispatch({ type: "optimize_success", result });
      setExpanded(false);
      toast.show({
        title:
          result.source === "google"
            ? "Live route ready"
            : "Demo route ready",
        tone: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't calculate this route. Check the addresses and try again.";
      dispatch({ type: "optimize_error", message });
      toast.show({ title: "Couldn't optimize route", tone: "error" });
    }
    // inputs used for type-checking RouteInputs; suppress unused-var if linter flags it
    void inputs;
  }

  function handleSave() {
    if (phase.kind !== "optimized") return;
    const result = phase.result;
    try {
      const stops = result.orderedStops;
      // Re-align rider names to the OPTIMIZED order so the saved record matches what the
      // user just saw. We pair each original stop with its rider; if a stop was duplicated
      // by Google, names align by exact-address match (first-match wins).
      const orderedRiders = stops.map((addr) => {
        const idx = waypoints.indexOf(addr);
        return idx >= 0 ? riderNames[idx] ?? null : null;
      });
      const hasAnyRider = orderedRiders.some((n) => n !== null && n !== "");
      saveRoute({
        label: `${start} → ${end}`,
        start,
        end,
        stops,
        riderNames: hasAnyRider ? orderedRiders : undefined,
        etaSeconds: result.etaSeconds,
        distanceMeters: result.distanceMeters,
        source: result.source,
      });
      toast.show({ title: "Route saved", tone: "success" });
    } catch {
      toast.show({ title: "Couldn't save route", tone: "error" });
    }
  }

  function handleLoad(r: SavedRoute) {
    setStart(r.start);
    setEnd(r.end);
    const stops = r.stops.length ? r.stops : [""];
    setWaypoints(stops);
    setRiderNames(
      ensureRidersAlignment(stops, r.riderNames ?? Array<string | null>(stops.length).fill(null))
    );
    setShowRiderNames(Boolean(r.riderNames?.some((n) => n)));
    dispatch({ type: "reset" });
    setExpanded(true);
    toast.show({ title: `Loaded ${r.label}`, tone: "info" });
  }

  function handleReset() {
    setStart("");
    setEnd("");
    setWaypoints([""]);
    setRiderNames([null]);
    setShowRiderNames(false);
    dispatch({ type: "reset" });
    setExpanded(true);
    toast.show({ title: "Cleared route", tone: "info" });
  }

  const optimized = phase.kind === "optimized" ? phase.result : null;
  const loading = phase.kind === "optimizing";
  const error = phase.kind === "editing" ? phase.error : undefined;
  const showSummary = optimized !== null && !expanded;

  const modeBadge =
    mode === "live" ? (
      <Badge tone="live">Live</Badge>
    ) : mode === "demo" ? (
      <Badge tone="demo">Demo</Badge>
    ) : (
      <Badge tone="error">Map error</Badge>
    );

  const formContent = (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-100">Carpool Optimizer</h1>
          <p className="truncate text-[11px] text-slate-400">Fastest drop-off order</p>
        </div>
        <div className="flex items-center gap-2">
          {modeBadge}
          <SettingsMenu onApiKeySaved={refreshApiKey} />
        </div>
      </header>

      <div className="space-y-2">
        <LocationInput
          label="Start"
          value={start}
          iconTone="emerald"
          onChange={(v) => {
            setStart(v);
            dispatch({ type: "edit_changed" });
          }}
          disabled={loading}
        />
        <LocationInput
          label="End"
          value={end}
          iconTone="red"
          onChange={(v) => {
            setEnd(v);
            dispatch({ type: "edit_changed" });
          }}
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSwapEnds}
            disabled={loading || (!start && !end)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-50"
          >
            <ArrowDownUp className="h-3 w-3" aria-hidden="true" /> Swap start/end
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showRiderNames}
              onChange={(e) => setShowRiderNames(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900/60 text-blue-500 focus:ring-blue-500/40"
            />
            Show rider names
          </label>
        </div>
      </div>

      <WaypointList
        waypoints={waypoints}
        riderNames={riderNames}
        disabled={loading}
        showRiderNames={showRiderNames}
        onAdd={handleAddStop}
        onRemove={handleRemoveStop}
        onRestore={handleRestoreStop}
        onChange={handleChangeStop}
        onChangeRider={handleChangeRider}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDuplicate={handleDuplicate}
      />

      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => dispatch({ type: "edit_changed" })}
        />
      )}

      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          onClick={handleOptimize}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {loading ? "Optimizing…" : "Optimize route"}
        </Button>
        <Button variant="ghost" size="sm" fullWidth onClick={handleReset}>
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Clear / new route
        </Button>
      </div>
    </div>
  );

  const summaryContent =
    optimized && (
      <RouteSummary
        start={start}
        end={end}
        optimized={optimized}
        riderNames={riderNames}
        onEdit={() => setExpanded(true)}
        onSave={handleSave}
      />
    );

  return (
    <main className="relative h-[100dvh] overflow-hidden">
      {/* Map fills viewport behind everything */}
      <div className="absolute inset-0">
        <MapView
          apiKey={apiKey}
          directionsResult={optimized?.directionsResult}
          onLoadError={() => setMapsLoadFailed(true)}
        />
      </div>

      {/* Saved routes menu, top-left, above map */}
      <SavedRoutesMenu onLoad={handleLoad} />

      {/* Desktop: fixed left panel >=md. Mobile: bottom sheet. */}
      <aside className="pointer-events-none absolute left-0 top-0 hidden h-full w-full max-w-md p-3 md:flex md:flex-col">
        <div className="pointer-events-auto mt-16 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/85 p-5 shadow-card backdrop-blur-xl">
          {showSummary ? summaryContent : formContent}
        </div>
      </aside>

      {/* Mobile sheet (hidden >=md) */}
      <div className="md:hidden">
        <RouteSheet expanded={expanded} onToggle={() => setExpanded((e) => !e)}>
          {showSummary ? summaryContent : formContent}
        </RouteSheet>
      </div>
    </main>
  );
}
