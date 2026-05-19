import { describe, expect, it } from "vitest";
import { buildRouteItineraryText } from "../lib/itinerary";
import type { OptimizedRoute } from "../lib/types";

const optimized: OptimizedRoute = {
  orderedStops: ["Alice House", "Bob House"],
  etaSeconds: 2700,
  distanceMeters: 19312,
  source: "ors",
  legs: [
    { etaSeconds: 600, distanceMeters: 3218 },
    { etaSeconds: 900, distanceMeters: 6437 },
    { etaSeconds: 1200, distanceMeters: 9656 },
  ],
};

describe("buildRouteItineraryText", () => {
  it("formats a complete copyable itinerary with totals and Google Maps URL", () => {
    const text = buildRouteItineraryText({
      start: "Home",
      end: "School",
      optimized,
      riderNames: ["Alice", null],
      mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Home&destination=School",
    });

    expect(text).toContain("Carpool route: Home → School");
    expect(text).toContain("Total: 45 min • 12.0 mi • 2 drop-offs");
    expect(text).toContain("S. Start: Home");
    expect(text).toContain("1. Alice — Alice House (+10 min, 2.0 mi leg)");
    expect(text).toContain("2. Stop 2 — Bob House (+15 min, 4.0 mi leg)");
    expect(text).toContain("E. End: School (+20 min, 6.0 mi leg)");
    expect(text).toContain("Open in Google Maps: https://www.google.com/maps/dir/?api=1&origin=Home&destination=School");
  });

  it("omits leg details and maps URL when not provided", () => {
    const text = buildRouteItineraryText({
      start: "A",
      end: "B",
      optimized: { orderedStops: ["C"], etaSeconds: 60, distanceMeters: 30, source: "mock" },
    });

    expect(text).toContain("Total: 1 min • 98 ft • 1 drop-off");
    expect(text).toContain("1. Stop 1 — C");
    expect(text).not.toContain("Open in Google Maps");
    expect(text).not.toContain("leg)");
  });
});
