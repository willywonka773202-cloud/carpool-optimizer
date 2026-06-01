import type { OptimizedRoute, RouteInputs } from "./types";

export function mockOptimizeRoute(input: RouteInputs): OptimizedRoute {
  const orderedStops = input.stops.map((stop) => stop.trim()).filter(Boolean);
  return { orderedStops, etaSeconds: 0, distanceMeters: 0, source: "mock" };
}
