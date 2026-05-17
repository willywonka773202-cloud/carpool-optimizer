"use client";

import { useEffect, useState } from "react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LocationInput } from "@/components/LocationInput";
import { WaypointList } from "@/components/WaypointList";
import { MapView } from "@/components/MapView";
import { RouteSheet } from "@/components/RouteSheet";
import { RouteSummary } from "@/components/RouteSummary";
import { SavedRoutesMenu } from "@/components/SavedRoutesMenu";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { validateRouteInputs } from "@/lib/validation";
import { optimizeRoute } from "@/lib/optimizeRoute";
import { mockOptimizeRoute } from "@/lib/mockOptimizeRoute";
import { getActiveApiKey } from "@/lib/googleMaps";
import { saveRoute } from "@/lib/storage";
import type { OptimizedRoute, SavedRoute } from "@/lib/types";

export default function Page() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapsLoadFailed, setMapsLoadFailed] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([""]);
  const [optimized, setOptimized] = useState<OptimizedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  function refreshApiKey() {
    setApiKey(getActiveApiKey());
  }
  useEffect(refreshApiKey, []);

  const useMock = !apiKey || mapsLoadFailed;

  async function handleOptimize() {
    if (loading) return;
    setError(null);

    const v = validateRouteInputs({ start, end, waypoints });
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setLoading(true);
    try {
      const result = useMock
        ? mockOptimizeRoute({ start, end, stops: v.cleanedWaypoints })
        : await optimizeRoute({ start, end, stops: v.cleanedWaypoints });
      setOptimized(result);
      setExpanded(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't calculate this route. Check the addresses and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!optimized) return;
    saveRoute({
      label: `${start} → ${end}`,
      start,
      end,
      stops: optimized.orderedStops,
    });
  }

  function handleLoad(r: SavedRoute) {
    setStart(r.start);
    setEnd(r.end);
    setWaypoints(r.stops.length ? r.stops : [""]);
    setOptimized(null);
    setExpanded(true);
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-slate-100">
      <div className="absolute inset-0">
        <MapView
          apiKey={apiKey}
          directionsResult={optimized?.directionsResult}
          onLoadError={() => setMapsLoadFailed(true)}
        />
      </div>

      <SavedRoutesMenu onLoad={handleLoad} />

      <RouteSheet expanded={expanded} onToggle={() => setExpanded((e) => !e)}>
        {!optimized || expanded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold text-slate-900">Carpool Optimizer</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  useMock ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {useMock ? "Mock mode" : "Live"}
              </span>
            </div>

            <ApiKeyDialog onSaved={refreshApiKey} />

            <LocationInput label="Start" value={start} onChange={setStart} disabled={loading} />
            <LocationInput label="End" value={end} onChange={setEnd} disabled={loading} />
            <WaypointList
              waypoints={waypoints}
              disabled={loading}
              onAdd={() => setWaypoints((w) => [...w, ""])}
              onRemove={(i) => setWaypoints((w) => w.filter((_, idx) => idx !== i))}
              onChange={(i, v) => setWaypoints((w) => w.map((x, idx) => (idx === i ? v : x)))}
            />

            {error && <ErrorAlert message={error} />}

            <button
              type="button"
              disabled={loading}
              onClick={handleOptimize}
              className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Optimizing…" : "Optimize Route"}
            </button>
          </div>
        ) : (
          <RouteSummary
            start={start}
            end={end}
            optimized={optimized}
            onEdit={() => setExpanded(true)}
            onSave={handleSave}
          />
        )}
      </RouteSheet>
    </main>
  );
}
