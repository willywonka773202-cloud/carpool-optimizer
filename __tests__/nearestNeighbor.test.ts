import { describe, expect, it } from "vitest";
import { nearestNeighborOrder } from "../lib/nearestNeighbor";
import type { Coord } from "../lib/orsTypes";

const c = (lat: number, lng: number): Coord => ({ lat, lng });

describe("nearestNeighborOrder", () => {
  it("returns [] for zero stops", () => {
    expect(nearestNeighborOrder(c(0, 0), [], c(1, 1))).toEqual([]);
  });

  it("returns [0] for one stop", () => {
    expect(nearestNeighborOrder(c(0, 0), [c(5, 5)], c(1, 1))).toEqual([0]);
  });

  it("orders stops greedily by distance from start, then chain", () => {
    // Start at origin. Stops:
    //   0: (10, 0)  — far east
    //   1: (1, 0)   — close
    //   2: (3, 0)   — medium
    // From origin, closest is 1. Then from (1,0) closest is 2. Then 0.
    const order = nearestNeighborOrder(
      c(0, 0),
      [c(10, 0), c(1, 0), c(3, 0)],
      c(0, 0)
    );
    expect(order).toEqual([1, 2, 0]);
  });

  it("preserves all stops exactly once", () => {
    const stops = [c(2, 2), c(5, 5), c(1, 1), c(9, 9), c(7, 7)];
    const order = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    expect(order).toHaveLength(stops.length);
    expect(new Set(order)).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("is deterministic for the same input", () => {
    const stops = [c(2, 2), c(5, 5), c(1, 1), c(9, 9), c(7, 7)];
    const a = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    const b = nearestNeighborOrder(c(0, 0), stops, c(10, 10));
    expect(a).toEqual(b);
  });
});
