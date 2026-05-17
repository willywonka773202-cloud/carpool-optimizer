import type { OptimizedRoute, RouteInputs } from "./types";

// Pure transformation, exported for unit tests.
export function applyOptimization(
  originalStops: string[],
  response: google.maps.DirectionsResult
): OptimizedRoute {
  const route = response.routes[0];
  const order = (route?.waypoint_order ?? []) as number[];
  const orderedStops = order.length
    ? order.map((i) => originalStops[i])
    : [...originalStops];
  const legs = (route?.legs ?? []) as google.maps.DirectionsLeg[];
  const etaSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
  const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
  return {
    orderedStops,
    etaSeconds,
    distanceMeters,
    source: "google",
    directionsResult: response,
  };
}

// Browser-only call. Throws if the Maps SDK isn't loaded.
export async function optimizeRoute(inputs: RouteInputs): Promise<OptimizedRoute> {
  if (typeof window === "undefined" || !window.google?.maps) {
    throw new Error("Google Maps SDK not loaded");
  }
  const service = new window.google.maps.DirectionsService();
  const response = await service.route({
    origin: inputs.start,
    destination: inputs.end,
    waypoints: inputs.stops.map((s) => ({ location: s, stopover: true })),
    travelMode: window.google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true,
  });
  return applyOptimization(inputs.stops, response);
}
