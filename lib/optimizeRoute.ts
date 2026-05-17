import type { OptimizedRoute, RouteInputs } from "./types";
import { geocodeAddress } from "./orsGeocode";
import { solveStopOrder } from "./orsOptimize";
import { fetchDirections } from "./orsDirections";
import type { Coord } from "./orsTypes";

export type OrsDeps = {
  geocode: (address: string) => Promise<Coord>;
  optimize: (start: Coord, end: Coord, stops: Coord[]) => Promise<number[]>;
  directions: (coordsInOrder: Coord[]) => Promise<{
    polyline: [number, number][];
    etaSeconds: number;
    distanceMeters: number;
  }>;
};

/**
 * Pure orchestrator — easy to test with stub deps.
 * - Zero stops: skip optimization, fetch directions for [start, end] only.
 * - One stop: skip optimization (only one possible order).
 */
export async function composeOptimization(
  inputs: RouteInputs,
  deps: OrsDeps
): Promise<OptimizedRoute> {
  const [startCoord, endCoord, ...stopCoords] = await Promise.all([
    deps.geocode(inputs.start),
    deps.geocode(inputs.end),
    ...inputs.stops.map((s) => deps.geocode(s)),
  ]);

  const optimizedIndexes =
    stopCoords.length <= 1
      ? stopCoords.map((_, i) => i)
      : await deps.optimize(startCoord, endCoord, stopCoords);

  const orderedStops = optimizedIndexes.map((i) => inputs.stops[i]);
  const orderedCoords = optimizedIndexes.map((i) => stopCoords[i]);

  const { polyline, etaSeconds, distanceMeters } = await deps.directions([
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
  };
}

/** Live entry point — used by the page. */
export async function optimizeRoute(
  inputs: RouteInputs,
  apiKey: string
): Promise<OptimizedRoute> {
  if (!apiKey) {
    throw new Error("No OpenRouteService API key available.");
  }
  return composeOptimization(inputs, {
    geocode: (addr) => geocodeAddress(addr, apiKey),
    optimize: (s, e, st) => solveStopOrder(s, e, st, apiKey),
    directions: (coords) => fetchDirections(coords, apiKey),
  });
}
