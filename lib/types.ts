import type { Coord } from "./orsTypes";

export type RouteInputs = {
  start: string;
  end: string;
  stops: string[];
};

/**
 * [lat, lng] pairs in render-ready order, suitable for Leaflet's <Polyline positions={...} />.
 */
export type RoutePolyline = [number, number][];

/** Per-leg time/distance: index 0 is Start→Stop1, the last is StopN→End. */
export type RouteLeg = {
  etaSeconds: number;
  distanceMeters: number;
};

export type OptimizedRoute = {
  orderedStops: string[];
  etaSeconds: number;
  distanceMeters: number;
  source: "ors" | "mock";
  /** Only the live ORS path populates this. Mock omits it. */
  polyline?: RoutePolyline;
  /** Optional: geocoded coords for each stop in the same order as orderedStops. Live mode populates this. */
  stopCoords?: Coord[];
  /** Per-leg ETA/distance from ORS segments. Index 0 = Start→Stop1, last = StopN→End. */
  legs?: RouteLeg[];
};

/**
 * Persisted route. `riderNames` is parallel to `stops` (same length when present);
 * each entry is the optional rider/passenger name for that stop. `updatedAt` is set
 * on every save after the initial create.
 */
export type SavedRoute = {
  id: string;
  label: string;
  start: string;
  end: string;
  stops: string[];
  createdAt: number;
  updatedAt?: number;
  riderNames?: (string | null)[];
  etaSeconds?: number;
  distanceMeters?: number;
  source?: "ors" | "mock";
};

/** Which optimizer the page should use, based on env and load status. */
export type OptimizationMode = "live" | "demo" | "loadError";
