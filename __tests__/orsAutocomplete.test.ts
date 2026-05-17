import { describe, expect, it, vi } from "vitest";
import { searchAutocomplete } from "../lib/orsAutocomplete";

function mockResponse<T>(body: T, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("searchAutocomplete", () => {
  it("returns [] for queries shorter than 3 characters without calling fetch", async () => {
    const fakeFetch = vi.fn() as unknown as typeof fetch;
    const out = await searchAutocomplete("ab", "KEY", 5, fakeFetch);
    expect(out).toEqual([]);
  });

  it("converts feature labels and [lng, lat] to Suggestion shape", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({
        features: [
          {
            properties: { label: "123 Main St, Springfield, IL, USA" },
            geometry: { coordinates: [-89.65, 39.78] },
          },
          {
            properties: { label: "Main St, Anywhere" },
            geometry: { coordinates: [-87.65, 41.88] },
          },
        ],
      })
    ) as unknown as typeof fetch;

    const out = await searchAutocomplete("main st", "KEY", 5, fakeFetch);
    expect(out).toEqual([
      { label: "123 Main St, Springfield, IL, USA", coord: { lat: 39.78, lng: -89.65 } },
      { label: "Main St, Anywhere", coord: { lat: 41.88, lng: -87.65 } },
    ]);
  });

  it("returns [] when fetch throws (network error)", async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const out = await searchAutocomplete("main st", "KEY", 5, fakeFetch);
    expect(out).toEqual([]);
  });

  it("returns [] on non-ok HTTP status (e.g. rate limit)", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({}, { ok: false, status: 429 })
    ) as unknown as typeof fetch;
    const out = await searchAutocomplete("main st", "KEY", 5, fakeFetch);
    expect(out).toEqual([]);
  });

  it("skips malformed features", async () => {
    const fakeFetch = vi.fn(async () =>
      mockResponse({
        features: [
          { properties: { label: "ok" }, geometry: { coordinates: [1, 2] } },
          { properties: {} },                          // no label
          { properties: { label: "no coords" } },      // no coords
          { properties: { label: "bad coords" }, geometry: { coordinates: [1] } }, // wrong shape
        ],
      })
    ) as unknown as typeof fetch;
    const out = await searchAutocomplete("main st", "KEY", 5, fakeFetch);
    expect(out).toEqual([{ label: "ok", coord: { lat: 2, lng: 1 } }]);
  });
});
