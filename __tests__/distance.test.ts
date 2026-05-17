import { describe, expect, it } from "vitest";
import { haversineMeters } from "../lib/distance";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters({ lat: 42, lng: -87 }, { lat: 42, lng: -87 })).toBe(0);
  });

  it("computes a known distance within tolerance", () => {
    // Chicago (41.8781, -87.6298) to New York (40.7128, -74.0060)
    // Real great-circle distance ~1,144 km.
    const d = haversineMeters(
      { lat: 41.8781, lng: -87.6298 },
      { lat: 40.7128, lng: -74.006 }
    );
    expect(d).toBeGreaterThan(1_100_000);
    expect(d).toBeLessThan(1_200_000);
  });

  it("is symmetric", () => {
    const a = { lat: 1, lng: 2 };
    const b = { lat: 10, lng: -3 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});
