import type { OptimizedRoute, RouteInputs } from "./types";
import { geocodeAddress } from "./orsGeocode";
import { solveStopOrder } from "./orsOptimize";
import { fetchDirections } from "./orsDirections";
import { nearestNeighborOrder } from "./nearestNeighbor";
import { haversineMeters } from "./distance";
import type { Coord } from "./orsTypes";

export type OrsDeps = {
  geocode: (address: string) => Promise<Coord>;
  optimize: (start: Coord, end: Coord, stops: Coord[]) => Promise<number[]>;
  directions: (coordsInOrder: Coord[]) => Promise<{
    polyline: [number, number][];
    etaSeconds: number;
    distanceMeters: number;
    legs?: { etaSeconds: number; distanceMeters: number }[];
    /**
     * True when this directions result is a fallback estimate (straight-line
     * polyline + haversine ETA) rather than the real provider's road geometry.
     */
    isEstimated?: boolean;
  }>;
};

export type ComposeOptions = {
  /** If provided, skip geocoding the start address and use this coord directly. */
  startCoord?: Coord;
};

/**
 * Average driving speed used only when ORS directions is unreachable and we
 * have to fall back to a haversine straight-line estimate. ~50 km/h.
 */
const FALLBACK_AVG_SPEED_MPS = 14;

/**
 * Build a synthetic straight-line polyline + summary from raw coords. Used as
 * a graceful fallback when ORS directions is unavailable but we still want to
 * show *something* on the map.
 */
function buildStraightLineRoute(
  start: Coord,
  ordered: Coord[],
  end: Coord
): { polyline: [number, number][]; etaSeconds: number; distanceMeters: number; legs: { etaSeconds: number; distanceMeters: number }[] } {
  const coords = [start, ...ordered, end];
  const legs: { etaSeconds: number; distanceMeters: number }[] = [];
  let distanceMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineMeters(coords[i], coords[i + 1]);
    distanceMeters += d;
    legs.push({
      etaSeconds: Math.round(d / FALLBACK_AVG_SPEED_MPS),
      distanceMeters: d,
    });
  }
  return {
    polyline: coords.map((c) => [c.lat, c.lng] as [number, number]),
    etaSeconds: Math.round(distanceMeters / FALLBACK_AVG_SPEED_MPS),
    distanceMeters,
    legs,
  };
}

/**
 * Pure orchestrator — easy to test with stub deps.
 */
export async function composeOptimization(
  inputs: RouteInputs,
  deps: OrsDeps,
  options: ComposeOptions = {}
): Promise<OptimizedRoute> {
  const startPromise: Promise<Coord> = options.startCoord
    ? Promise.resolve(options.startCoord)
    : deps.geocode(inputs.start);

  const [startCoord, endCoord, ...stopCoords] = await Promise.all([
    startPromise,
    deps.geocode(inputs.end),
    ...inputs.stops.map((s) => deps.geocode(s)),
  ]);

  const optimizedIndexes =
    stopCoords.length <= 1
      ? stopCoords.map((_, i) => i)
      : await deps.optimize(startCoord, endCoord, stopCoords);

  const orderedStops = optimizedIndexes.map((i) => inputs.stops[i]);
  const orderedCoords = optimizedIndexes.map((i) => stopCoords[i]);

  const { polyline, etaSeconds, distanceMeters, legs, isEstimated } = await deps.directions([
    startCoord,
    ...orderedCoords,
    endCoord,
  ]);

  return {
    orderedStops,
    etaSeconds,
    distanceMeters,
    source: "ors",
    polyline,
    stopCoords: orderedCoords,
    legs,
    ...(isEstimated ? { isEstimated: true } : {}),
  };
}

/**
 * Live entry point — wires composeOptimization to real ORS endpoints. Adds
 * two graceful fallbacks:
 *   1. If ORS optimization fails, use local nearest-neighbor on the geocoded
 *      coords (still real coords, just a greedy solver).
 *   2. If ORS directions fails, synthesize a straight-line polyline from the
 *      ordered coords. The route is still valid; just less precise.
 */
export async function optimizeRoute(
  inputs: RouteInputs,
  apiKey: string,
  options: ComposeOptions = {}
): Promise<OptimizedRoute> {
  if (!apiKey) {
    throw new Error("No OpenRouteService API key available.");
  }

  const deps: OrsDeps = {
    geocode: (addr) => geocodeAddress(addr, apiKey),
    optimize: async (s, e, st) => {
      try {
        return await solveStopOrder(s, e, st, apiKey);
      } catch {
        // Fallback to local greedy solver — still uses real coords.
        return nearestNeighborOrder(s, st, e);
      }
    },
    directions: async (coords) => {
      try {
        return await fetchDirections(coords, apiKey);
      } catch {
        // Fallback to straight-line polyline + haversine estimate.
        return {
          ...buildStraightLineRoute(coords[0], coords.slice(1, -1), coords[coords.length - 1]),
          isEstimated: true,
        };
      }
    },
  };

  return composeOptimization(inputs, deps, options);
}
