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

export type RouteOption = {
  id: string;
  label: string;
  etaSeconds: number;
  distanceMeters: number;
  polyline: RoutePolyline;
};

export type RideRepeat = "none" | "daily" | "weekdays" | "weekly";

export type RidePlan = {
  driverName: string;
  driverNote?: string;
  rideDate: string;
  arrivalTime: string;
  repeat: RideRepeat;
  seatsAvailable: number;
  reminderMinutes: number;
  checklist: string[];
};

export type RouteIntent = "fastest" | "balanced" | "alternate";

export type RoutePreferences = {
  intent: RouteIntent;
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidFerries: boolean;
  avoidReportedHazards: boolean;
};

export type SavedTripDefaults = {
  driverName: string;
  seatsAvailable: number;
  reminderMinutes: number;
  repeat: RideRepeat;
  checklist: string[];
  routePreferences: RoutePreferences;
};

export type SavedRouteProgress = {
  completedStopKeys: string[];
  completedChecklistKeys: string[];
  lastUpdatedAt?: number;
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
  /** Alternative map routes for the selected stop order. */
  routeOptions?: RouteOption[];
  selectedRouteIndex?: number;
};

/**
 * Persisted route. `riderNames` is parallel to `stops` (same length when present);
 * each entry is the optional rider/passenger name for that stop. `updatedAt` is set
 * on every save after the initial create. `driveCount` and `lastDrivenAt` track local
 * completed-drive history for a saved route.
 */
export type SavedRoute = {
  id: string;
  label: string;
  start: string;
  end: string;
  stops: string[];
  createdAt: number;
  updatedAt?: number;
  isPinned?: boolean;
  riderNames?: (string | null)[];
  ridePlan?: RidePlan;
  routePreferences?: RoutePreferences;
  etaSeconds?: number;
  distanceMeters?: number;
  source?: "ors" | "mock";
  progress?: SavedRouteProgress;
  driveCount?: number;
  lastDrivenAt?: number;
};

/** Which optimizer the page should use, based on env and load status. */
export type OptimizationMode = "live" | "demo" | "loadError";
