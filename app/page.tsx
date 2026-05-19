"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { ArrowDownUp, RotateCcw, Sparkles } from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LocationInput } from "@/components/LocationInput";
import { UseLocationButton } from "@/components/UseLocationButton";
import { WaypointList } from "@/components/WaypointList";
import { MapView } from "@/components/MapView";
import type { Coord } from "@/lib/orsTypes";
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
import { getActiveApiKey } from "@/lib/orsKey";
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
  const [startCoord, setStartCoord] = useState<Coord | null>(null);
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

  function handleUseLocation(coord: Coord) {
    setStartCoord(coord);
    setStart(`Current location (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`);
    dispatch({ type: "edit_changed" });
    toast.show({ title: "Using current location as start", tone: "success" });
  }
  function handleLocationError(message: string) {
    dispatch({ type: "validation_failed", message });
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
        : await optimizeRoute(cleanInputs, apiKey ?? "", { startCoord: startCoord ?? undefined });
      dispatch({ type: "optimize_success", result });
      setExpanded(false);
      toast.show({
        title:
          result.source === "ors"
            ? "Route ready"
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
    setStartCoord(null);
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
    setStartCoord(null);
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
      <Badge tone="live">Live routing</Badge>
    ) : mode === "demo" ? (
      <Badge tone="demo">Demo</Badge>
    ) : (
      <Badge tone="error">Map issue</Badge>
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
          apiKey={apiKey}
          onChange={(v) => {
            setStart(v);
            if (startCoord) setStartCoord(null);
            dispatch({ type: "edit_changed" });
          }}
          disabled={loading}
        />
        <LocationInput
          label="End"
          value={end}
          iconTone="red"
          apiKey={apiKey}
          onChange={(v) => {
            setEnd(v);
            dispatch({ type: "edit_changed" });
          }}
          disabled={loading}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UseLocationButton
              onLocate={handleUseLocation}
              onError={handleLocationError}
              disabled={loading}
            />
            {startCoord && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
                GPS start
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSwapEnds}
              disabled={loading || (!start && !end)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <ArrowDownUp className="h-3 w-3" aria-hidden="true" /> Swap
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showRiderNames}
                onChange={(e) => setShowRiderNames(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-slate-900/60 text-blue-500 focus:ring-blue-500/40"
              />
              Rider names
            </label>
          </div>
        </div>
      </div>

      <WaypointList
        apiKey={apiKey}
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
    <main className="grid h-[100dvh] grid-cols-1 md:grid-cols-[28rem_1fr]">
      {/* Desktop side panel (md+) — real grid column, no longer an overlay */}
      <aside className="relative hidden h-full min-h-0 flex-col border-r border-white/10 bg-slate-900/80 backdrop-blur-xl md:flex">
        <div className="flex h-full min-h-0 flex-col p-5">
          <SavedRoutesDesktopBar onLoad={handleLoad} />
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">
            {showSummary ? summaryContent : formContent}
          </div>
        </div>
      </aside>

      {/* Right column: the map. On mobile this is the whole screen. */}
      <div className="relative h-full min-h-0">
        <div className="absolute inset-0">
          <MapView
            apiKey={apiKey}
            polyline={optimized?.polyline}
            stopCoords={optimized?.stopCoords}
            onLoadError={() => setMapsLoadFailed(true)}
          />
        </div>

        {/* Mobile-only: hamburger for saved routes, top-left of map */}
        <div className="md:hidden">
          <SavedRoutesMenu onLoad={handleLoad} />
        </div>

        {/* Mobile-only: bottom sheet */}
        <div className="md:hidden">
          <RouteSheet expanded={expanded} onToggle={() => setExpanded((e) => !e)}>
            {showSummary ? summaryContent : formContent}
          </RouteSheet>
        </div>
      </div>
    </main>
  );
}

/** Desktop-only top bar inside the panel — small "Saved routes" button. */
function SavedRoutesDesktopBar({ onLoad }: { onLoad: (r: SavedRoute) => void }) {
  return (
    <div className="relative">
      <SavedRoutesMenu onLoad={onLoad} />
    </div>
  );
}
