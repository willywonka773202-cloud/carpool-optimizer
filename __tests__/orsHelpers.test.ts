import { describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "../lib/orsGeocode";
import { extractJobOrder, solveStopOrder } from "../lib/orsOptimize";
import { extractDirections, fetchDirections } from "../lib/orsDirections";

function mockResponse<T>(body: T, init?: { status?: number; ok?: boolean }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("geocodeAddress", () => {
  it("converts ORS [lng, lat] feature to {lat, lng}", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({
        features: [{ geometry: { coordinates: [-87.85, 42.17] } }],
      })
    ) as unknown as typeof fetch;
    const c = await geocodeAddress("Deerfield, IL", "KEY", fakeFetch);
    expect(c).toEqual({ lat: 42.17, lng: -87.85 });
  });

  it("throws actionable error when no feature is returned", async () => {
    const fakeFetch = vi.fn(async () => mockResponse({ features: [] })) as unknown as typeof fetch;
    await expect(geocodeAddress("xqyz", "KEY", fakeFetch)).rejects.toThrow(/Couldn't find/);
  });

  it("throws on 401 / 403 with API-key guidance", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({}, { ok: false, status: 401 })
    ) as unknown as typeof fetch;
    await expect(geocodeAddress("A", "KEY", fakeFetch)).rejects.toThrow(/API key/);
  });
});

describe("extractJobOrder", () => {
  it("returns 0-based indices from 1-based job ids in step order", () => {
    expect(
      extractJobOrder({
        routes: [
          {
            steps: [
              { type: "start" },
              { type: "job", id: 3 },
              { type: "job", id: 1 },
              { type: "job", id: 2 },
              { type: "end" },
            ],
          },
        ],
      })
    ).toEqual([2, 0, 1]);
  });

  it("returns [] when there are no jobs", () => {
    expect(extractJobOrder({})).toEqual([]);
  });
});

describe("solveStopOrder", () => {
  it("short-circuits to [] when there are no stops (no fetch)", async () => {
    const fakeFetch = vi.fn() as unknown as typeof fetch;
    const out = await solveStopOrder(
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      [],
      "KEY",
      fakeFetch
    );
    expect(out).toEqual([]);
  });

  it("throws when ORS returns fewer jobs than stops", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({
        routes: [{ steps: [{ type: "start" }, { type: "job", id: 1 }, { type: "end" }] }],
      })
    ) as unknown as typeof fetch;
    await expect(
      solveStopOrder(
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        [
          { lat: 2, lng: 2 },
          { lat: 3, lng: 3 },
        ],
        "KEY",
        fakeFetch
      )
    ).rejects.toThrow(/incomplete/);
  });
});

describe("extractDirections", () => {
  it("flips [lng, lat] to [lat, lng] and pulls summary", () => {
    const r = extractDirections({
      features: [
        {
          geometry: { coordinates: [[-87.85, 42.17], [-87.84, 42.18]] },
          properties: { summary: { duration: 1200, distance: 8000 } },
        },
      ],
    });
    expect(r.polyline).toEqual([
      [42.17, -87.85],
      [42.18, -87.84],
    ]);
    expect(r.etaSeconds).toBe(1200);
    expect(r.distanceMeters).toBe(8000);
  });

  it("throws when no feature geometry is returned", () => {
    expect(() => extractDirections({ features: [] })).toThrow(/no route geometry/i);
  });
});

describe("fetchDirections", () => {
  it("rejects when fewer than 2 coordinates supplied (no network call)", async () => {
    const fakeFetch = vi.fn() as unknown as typeof fetch;
    await expect(
      fetchDirections([{ lat: 0, lng: 0 }], "KEY", fakeFetch)
    ).rejects.toThrow(/at least 2/);
  });
});
