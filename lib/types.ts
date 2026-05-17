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

export type SavedRoute = {
  id: string;
  label: string;
  start: string;
  end: string;
  stops: string[];
  createdAt: number;
};
