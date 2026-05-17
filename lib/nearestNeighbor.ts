import type { Coord } from "./orsTypes";
import { haversineMeters } from "./distance";

/**
 * Greedy nearest-neighbor TSP: starting at `start`, repeatedly visit the closest
 * unvisited stop, ending at `end`. Returns the visit order as 0-based indices
 * into the original `stops` array.
 *
 * Deterministic for any input, tie-breaks by lowest original index.
 */
export function nearestNeighborOrder(
  start: Coord,
  stops: Coord[],
  _end: Coord
): number[] {
  void _end; // end coord is informational; not used by pure nearest-neighbor
  if (stops.length === 0) return [];
  if (stops.length === 1) return [0];

  const remaining = stops.map((_, i) => i);
  const order: number[] = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIdx = remaining[0];
    let bestDist = haversineMeters(current, stops[bestIdx]);
    for (let i = 1; i < remaining.length; i++) {
      const idx = remaining[i];
      const d = haversineMeters(current, stops[idx]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }
    order.push(bestIdx);
    remaining.splice(remaining.indexOf(bestIdx), 1);
    current = stops[bestIdx];
  }

  return order;
}
