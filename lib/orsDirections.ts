import type { Coord, RoutePolyline } from "./orsTypes";

export type DirectionsFetch = typeof fetch;

const DIRECTIONS_URL = "/api/ors/v2/directions/driving-car/geojson";

type OrsDirectionsResponse = {
  features?: Array<{
    geometry?: { coordinates?: [number, number][] };
    properties?: {
      summary?: { distance?: number; duration?: number };
      segments?: Array<{ distance?: number; duration?: number }>;
    };
  }>;
};

export type DirectionsResult = {
  polyline: RoutePolyline;
  etaSeconds: number;
  distanceMeters: number;
  legs?: { etaSeconds: number; distanceMeters: number }[];
};

/**
 * Pure transformation — convert an ORS GeoJSON FeatureCollection into a
 * Leaflet-ready polyline + summary. ORS returns [lng, lat]; we flip to [lat, lng].
 */
export function extractDirections(response: OrsDirectionsResponse): DirectionsResult {
  const feature = response.features?.[0];
  if (!feature?.geometry?.coordinates) {
    throw new Error("ORS returned no route geometry.");
  }
  const polyline: RoutePolyline = feature.geometry.coordinates.map(
    (c) => [c[1], c[0]] as [number, number]
  );
  const summary = feature.properties?.summary ?? {};
  const rawSegments = feature.properties?.segments ?? [];
  const legs = rawSegments.map((s) => ({
    etaSeconds: typeof s.duration === "number" ? s.duration : 0,
    distanceMeters: typeof s.distance === "number" ? s.distance : 0,
  }));
  return {
    polyline,
    etaSeconds: typeof summary.duration === "number" ? summary.duration : 0,
    distanceMeters: typeof summary.distance === "number" ? summary.distance : 0,
    legs: legs.length > 0 ? legs : undefined,
  };
}

export async function fetchDirections(
  coordsInOrder: Coord[],
  apiKey: string,
  fetchFn: DirectionsFetch = fetch
): Promise<DirectionsResult> {
  if (coordsInOrder.length < 2) {
    throw new Error("Need at least 2 coordinates to build a route.");
  }
  const body = {
    coordinates: coordsInOrder.map((c) => [c.lng, c.lat]),
  };

  let res: Response;
  try {
    res = await fetchFn(DIRECTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error fetching route: ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("OpenRouteService rejected the API key. Check NEXT_PUBLIC_OPENROUTESERVICE_API_KEY.");
  }
  if (!res.ok) {
    throw new Error(`Route fetch failed (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as OrsDirectionsResponse;
  return extractDirections(data);
}
