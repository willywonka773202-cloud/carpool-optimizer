import { nearestNeighborOrder } from "./nearestNeighbor";
import { searchAutocomplete } from "./orsAutocomplete";
import type { Coord } from "./orsTypes";
import type { OptimizedRoute, RouteInputs } from "./types";

/** Resolve an address to a coordinate (or null if it can't be geocoded). */
export type GeocodeFn = (address: string) => Promise<Coord | null>;

/** Free, keyless geocode via the app's Nominatim-backed autocomplete (apiKey = null). */
const defaultGeocode: GeocodeFn = async (address) => {
  const results = await searchAutocomplete(address, null, 1);
  return results[0]?.coord ?? null;
};

export type LocalOptimizeOptions = {
  /** Coords already known from autocomplete previews, aligned to inputs.stops. */
  startCoord?: Coord | null;
  endCoord?: Coord | null;
  stopCoords?: (Coord | null)[];
  geocode?: GeocodeFn;
};

export type LocalOptimizeResult = {
  route: OptimizedRoute;
  startCoord: Coord | null;
  endCoord: Coord | null;
};

async function safeGeocode(geocode: GeocodeFn, address: string): Promise<Coord | null> {
  const a = address.trim();
  if (!a) return null;
  try {
    return await geocode(a);
  } catch {
    return null;
  }
}

/**
 * Free, keyless drop-off optimizer. Resolves coordinates for the start, end, and every
 * stop (reusing any coords already known, geocoding the rest via the free service), then
 * orders the stops with a greedy nearest-neighbor pass. This is what makes the order
 * ACTUALLY optimize without an OpenRouteService key.
 *
 * Degrades gracefully: if the start or any stop can't be geocoded, it returns the stops
 * in their given order (never throws) so planning still works offline / on geocoder errors.
 */
export async function localOptimizeRoute(
  inputs: RouteInputs,
  options: LocalOptimizeOptions = {}
): Promise<LocalOptimizeResult> {
  const geocode = options.geocode ?? defaultGeocode;
  const stops = inputs.stops.map((s) => s.trim()).filter(Boolean);

  const startCoord = options.startCoord ?? (await safeGeocode(geocode, inputs.start));
  const endCoord = options.endCoord ?? (await safeGeocode(geocode, inputs.end));
  const stopCoords = await Promise.all(
    stops.map(async (addr, i) => options.stopCoords?.[i] ?? (await safeGeocode(geocode, addr)))
  );

  const allStopsResolved = stopCoords.every((c): c is Coord => c != null);

  // Can't optimize without a start anchor and every stop located → keep given order.
  if (!startCoord || !allStopsResolved || stops.length < 2) {
    return {
      route: {
        orderedStops: stops,
        etaSeconds: 0,
        distanceMeters: 0,
        source: "mock",
        stopCoords: allStopsResolved ? (stopCoords as Coord[]) : undefined,
      },
      startCoord: startCoord ?? null,
      endCoord: endCoord ?? null,
    };
  }

  const order = nearestNeighborOrder(startCoord, stopCoords as Coord[], endCoord ?? startCoord);
  const orderedStops = order.map((i) => stops[i]);
  const orderedCoords = order.map((i) => stopCoords[i] as Coord);

  return {
    route: {
      orderedStops,
      etaSeconds: 0,
      distanceMeters: 0,
      source: "mock",
      stopCoords: orderedCoords,
    },
    startCoord,
    endCoord: endCoord ?? null,
  };
}
