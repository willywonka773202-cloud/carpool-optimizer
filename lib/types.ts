export type RouteInputs = {
  start: string;
  end: string;
  stops: string[];
};

/**
 * [lat, lng] pairs in render-ready order, suitable for Leaflet's <Polyline positions={...} />.
 */
export type RoutePolyline = [number, number][];

export type OptimizedRoute = {
  orderedStops: string[];
  etaSeconds: number;
  distanceMeters: number;
  source: "ors" | "mock";
  /** Only the live ORS path populates this. Mock omits it. */
  polyline?: RoutePolyline;
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
