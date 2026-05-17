import { describe, it, expect } from "vitest";
import { buildOptimizedHandoffUrl } from "../lib/handoffUrl";
import { mockOptimizeRoute } from "../lib/mockOptimizeRoute";
import { buildGoogleMapsUrl } from "../lib/routeUrl";
import type { OptimizedRoute } from "../lib/types";

describe("buildOptimizedHandoffUrl — guarantees optimized order is used", () => {
  it("uses optimized order C, A, B when waypoint_order is [2, 0, 1] and input was A, B, C", () => {
    const optimized: OptimizedRoute = {
      orderedStops: ["C", "A", "B"],
      etaSeconds: 400,
      distanceMeters: 4000,
      source: "ors",
    };
    expect(optimized.orderedStops).toEqual(["C", "A", "B"]);

    const url = buildOptimizedHandoffUrl("Home", "School", optimized);
    expect(url).toContain("waypoints=C|A|B");
  });

  it("does NOT leak the original input order into the URL when optimized differs", () => {
    const optimized: OptimizedRoute = {
      orderedStops: ["C", "A", "B"],
      etaSeconds: 0,
      distanceMeters: 0,
      source: "ors",
    };
    const url = buildOptimizedHandoffUrl("Home", "School", optimized);

    // The "original order" string A|B|C must not appear after a "waypoints=".
    expect(url).not.toContain("waypoints=A|B|C");
  });

  it("omits the waypoints param when the optimized route has zero stops", () => {
    const empty: OptimizedRoute = {
      orderedStops: [],
      etaSeconds: 0,
      distanceMeters: 0,
      source: "mock",
    };
    const url = buildOptimizedHandoffUrl("X", "Y", empty);
    expect(url).not.toContain("waypoints=");
    expect(url).toContain("origin=X");
    expect(url).toContain("destination=Y");
    expect(url).toContain("travelmode=driving");
  });

  it("encodes special characters in each stop", () => {
    const opt: OptimizedRoute = {
      orderedStops: [
        "Lake Cook Rd & Waukegan Rd, IL",
        "Apt 5B, 12 N Wells St, Chicago, IL 60606",
      ],
      etaSeconds: 0,
      distanceMeters: 0,
      source: "ors",
    };
    const url = buildOptimizedHandoffUrl("Home", "Work", opt);
    expect(url).toContain("Lake%20Cook%20Rd%20%26%20Waukegan%20Rd%2C%20IL");
    expect(url).toContain("Apt%205B%2C%2012%20N%20Wells%20St%2C%20Chicago%2C%20IL%2060606");
    // The pipe separator must be a literal "|" between encoded stops, not "%7C".
    expect(url).toContain("|");
    expect(url.match(/waypoints=[^&]*/)?.[0].split("|").length).toBe(2);
    expect(url).not.toContain("%7C");
  });

  it("uses mock-optimized order when source is 'mock'", () => {
    const mockResult = mockOptimizeRoute({
      start: "S",
      end: "E",
      stops: ["Alpha", "Beta", "Gamma"],
    });
    const url = buildOptimizedHandoffUrl("S", "E", mockResult);
    const wpParam = url.match(/waypoints=([^&]*)/)?.[1];
    expect(wpParam).toBeTruthy();
    const orderInUrl = decodeURIComponent(wpParam!).split("|");
    expect(orderInUrl).toEqual(mockResult.orderedStops);
  });

  it("matches the raw buildGoogleMapsUrl output for the same optimized order (single source of truth)", () => {
    const opt: OptimizedRoute = {
      orderedStops: ["C", "A", "B"],
      etaSeconds: 0,
      distanceMeters: 0,
      source: "ors",
    };
    const direct = buildGoogleMapsUrl({
      start: "Home",
      end: "School",
      orderedStops: opt.orderedStops,
    });
    const helper = buildOptimizedHandoffUrl("Home", "School", opt);
    expect(helper).toBe(direct);
  });
});
