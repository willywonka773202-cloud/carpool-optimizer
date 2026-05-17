import { describe, expect, it, vi } from "vitest";
import { composeOptimization } from "../lib/optimizeRoute";
import type { Coord } from "../lib/orsTypes";

const coord = (lat: number, lng: number): Coord => ({ lat, lng });

describe("composeOptimization", () => {
  it("returns optimized order from ORS, reorders stops + coords, source 'ors'", async () => {
    const geocode = vi.fn(async (addr: string) => {
      const map: Record<string, Coord> = {
        Home: coord(1, 1),
        School: coord(2, 2),
        A: coord(3, 3),
        B: coord(4, 4),
        C: coord(5, 5),
      };
      return map[addr];
    });
    const optimize = vi.fn(async () => [2, 0, 1]);
    const directions = vi.fn(async () => ({
      polyline: [[1, 1], [5, 5], [3, 3], [4, 4], [2, 2]] as [number, number][],
      etaSeconds: 1800,
      distanceMeters: 24000,
    }));

    const result = await composeOptimization(
      { start: "Home", end: "School", stops: ["A", "B", "C"] },
      { geocode, optimize, directions }
    );

    expect(result.source).toBe("ors");
    expect(result.orderedStops).toEqual(["C", "A", "B"]);
    expect(result.etaSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(24000);
    expect(result.polyline).toHaveLength(5);

    expect(directions).toHaveBeenCalledWith([
      coord(1, 1),
      coord(5, 5),
      coord(3, 3),
      coord(4, 4),
      coord(2, 2),
    ]);
  });

  it("skips optimize() when there is exactly one stop", async () => {
    const geocode = vi.fn(async () => coord(0, 0));
    const optimize = vi.fn();
    const directions = vi.fn(async () => ({
      polyline: [] as [number, number][],
      etaSeconds: 60,
      distanceMeters: 1000,
    }));
    const result = await composeOptimization(
      { start: "H", end: "S", stops: ["X"] },
      { geocode, optimize, directions }
    );
    expect(optimize).not.toHaveBeenCalled();
    expect(result.orderedStops).toEqual(["X"]);
  });

  it("skips optimize() when there are zero stops", async () => {
    const geocode = vi.fn(async () => coord(0, 0));
    const optimize = vi.fn();
    const directions = vi.fn(async () => ({
      polyline: [] as [number, number][],
      etaSeconds: 0,
      distanceMeters: 0,
    }));
    const result = await composeOptimization(
      { start: "H", end: "S", stops: [] },
      { geocode, optimize, directions }
    );
    expect(optimize).not.toHaveBeenCalled();
    expect(result.orderedStops).toEqual([]);
  });

  it("propagates geocoding failures", async () => {
    const geocode = vi.fn(async (addr: string) => {
      if (addr === "B") throw new Error("Couldn't find address: \"B\". Try a more specific address.");
      return coord(0, 0);
    });
    const optimize = vi.fn();
    const directions = vi.fn();
    await expect(
      composeOptimization(
        { start: "H", end: "S", stops: ["A", "B"] },
        { geocode, optimize, directions }
      )
    ).rejects.toThrow(/Couldn't find address/);
  });
});
