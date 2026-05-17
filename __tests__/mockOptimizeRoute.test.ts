import { describe, it, expect } from "vitest";
import { mockOptimizeRoute } from "../lib/mockOptimizeRoute";

describe("mockOptimizeRoute", () => {
  it("preserves stop count", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    expect(r.orderedStops).toHaveLength(3);
    expect(new Set(r.orderedStops)).toEqual(new Set(["A", "B", "C"]));
  });

  it("is deterministic given identical input", () => {
    const a = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    const b = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B", "C"] });
    expect(a.orderedStops).toEqual(b.orderedStops);
  });

  it("returns source 'mock' and no directionsResult", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A"] });
    expect(r.source).toBe("mock");
    expect(r.directionsResult).toBeUndefined();
  });

  it("returns positive synthetic eta and distance", () => {
    const r = mockOptimizeRoute({ start: "S", end: "E", stops: ["A", "B"] });
    expect(r.etaSeconds).toBeGreaterThan(0);
    expect(r.distanceMeters).toBeGreaterThan(0);
  });
});
