import { describe, expect, it, vi } from "vitest";
import { localOptimizeRoute, type GeocodeFn } from "../lib/localOptimize";
import type { Coord } from "../lib/orsTypes";

describe("localOptimizeRoute (free keyless optimizer)", () => {
  it("reorders stops by nearest-neighbor from the start using provided coords", async () => {
    // start at origin; stops given out of order — nearest first should be A, then C, then B.
    const result = await localOptimizeRoute(
      { start: "Home", end: "End", stops: ["B", "A", "C"] },
      {
        startCoord: { lat: 0, lng: 0 },
        endCoord: { lat: 0, lng: 3 },
        stopCoords: [
          { lat: 0, lng: 2 }, // B
          { lat: 0, lng: 0.5 }, // A (closest)
          { lat: 0, lng: 1 }, // C
        ],
      }
    );
    expect(result.route.orderedStops).toEqual(["A", "C", "B"]);
    expect(result.route.stopCoords).toEqual([
      { lat: 0, lng: 0.5 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]);
    expect(result.route.source).toBe("mock");
  });

  it("geocodes only the stops that lack a provided coord", async () => {
    const geocode = vi.fn(
      async (addr: string): Promise<Coord | null> => (addr === "B" ? { lat: 0, lng: 2 } : null)
    );
    const result = await localOptimizeRoute(
      { start: "Home", end: "End", stops: ["A", "B"] },
      {
        startCoord: { lat: 0, lng: 0 },
        endCoord: { lat: 0, lng: 3 },
        stopCoords: [{ lat: 0, lng: 0.5 } as Coord, null], // A known, B missing
        geocode,
      }
    );
    // Only B was geocoded (A's coord was provided).
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith("B");
    expect(result.route.orderedStops).toEqual(["A", "B"]);
  });

  it("falls back to the given order (no reorder) when a stop can't be geocoded", async () => {
    const geocode: GeocodeFn = async () => null;
    const result = await localOptimizeRoute(
      { start: "Home", end: "End", stops: ["A", "B"] },
      { startCoord: { lat: 0, lng: 0 }, stopCoords: [null, null], geocode }
    );
    expect(result.route.orderedStops).toEqual(["A", "B"]);
    expect(result.route.stopCoords).toBeUndefined();
  });

  it("never throws when the geocoder errors — degrades to input order", async () => {
    const geocode: GeocodeFn = async () => {
      throw new Error("network down");
    };
    const result = await localOptimizeRoute(
      { start: "Home", end: "End", stops: ["A", "B"] },
      { geocode }
    );
    expect(result.route.orderedStops).toEqual(["A", "B"]);
  });
});
