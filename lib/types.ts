export type RouteInputs = {
  start: string;
  end: string;
  stops: string[];
};

export type OptimizedRoute = {
  orderedStops: string[];
  etaSeconds: number;
  distanceMeters: number;
  source: "google" | "mock";
  // Optional: only the real DirectionsService path returns this.
  // The mock fallback omits it because there's no real route to render.
  directionsResult?: google.maps.DirectionsResult;
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
  source?: "google" | "mock";
};

/** Which optimizer the page should use, based on env and load status. */
export type OptimizationMode = "live" | "demo" | "loadError";
