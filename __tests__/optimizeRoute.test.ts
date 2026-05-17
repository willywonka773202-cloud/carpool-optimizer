import { describe, it, expect } from "vitest";
import { applyOptimization } from "../lib/optimizeRoute";

const fakeResponse = {
  routes: [
    {
      waypoint_order: [2, 0, 1],
      legs: [
        { duration: { value: 300 }, distance: { value: 1000 } },
        { duration: { value: 600 }, distance: { value: 2500 } },
        { duration: { value: 450 }, distance: { value: 1800 } },
        { duration: { value: 750 }, distance: { value: 4000 } },
      ],
    },
  ],
} as unknown as google.maps.DirectionsResult;

describe("applyOptimization", () => {
  it("reorders stops by waypoint_order", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.orderedStops).toEqual(["C", "A", "B"]);
  });

  it("sums leg durations and distances", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.etaSeconds).toBe(300 + 600 + 450 + 750);
    expect(r.distanceMeters).toBe(1000 + 2500 + 1800 + 4000);
  });

  it("marks source as google and includes the raw response", () => {
    const r = applyOptimization(["A", "B", "C"], fakeResponse);
    expect(r.source).toBe("google");
    expect(r.directionsResult).toBe(fakeResponse);
  });

  it("handles missing duration/distance values as zero", () => {
    const partial = {
      routes: [
        {
          waypoint_order: [0],
          legs: [{ duration: undefined, distance: undefined }, {}],
        },
      ],
    } as unknown as google.maps.DirectionsResult;
    const r = applyOptimization(["X"], partial);
    expect(r.etaSeconds).toBe(0);
    expect(r.distanceMeters).toBe(0);
  });
});
