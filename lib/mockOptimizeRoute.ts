import type { OptimizedRoute, RouteInputs } from "./types";

export function mockOptimizeRoute(input: RouteInputs): OptimizedRoute {
  const start = input.start.trim();
  const end = input.end.trim();
  const orderedStops = [...input.stops].sort((a, b) => {
    const aScore = Math.abs(a.length - start.length) + a.localeCompare(end);
    const bScore = Math.abs(b.length - start.length) + b.localeCompare(end);
    return aScore - bScore;
  });
  // Synthetic numbers: ~11 min per stop + 9 min buffer; ~3.4 mi per stop.
  const etaSeconds = Math.max(18, orderedStops.length * 11 + 9) * 60;
  const distanceMeters = Math.max(4, orderedStops.length * 3.4) * 1609.34;
  return { orderedStops, etaSeconds, distanceMeters, source: "mock" };
}
