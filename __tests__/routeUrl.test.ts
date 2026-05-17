import { describe, it, expect } from "vitest";
import { buildGoogleMapsUrl } from "../lib/routeUrl";

describe("buildGoogleMapsUrl", () => {
  it("encodes origin, destination, and waypoints", () => {
    const url = buildGoogleMapsUrl({
      start: "Deerfield High School, IL",
      end: "Chicago, IL",
      orderedStops: ["Highland Park, IL", "Northbrook, IL"],
    });
    expect(url).toContain("api=1");
    expect(url).toContain("origin=Deerfield%20High%20School%2C%20IL");
    expect(url).toContain("destination=Chicago%2C%20IL");
    expect(url).toContain("travelmode=driving");
    expect(url).toContain("waypoints=Highland%20Park%2C%20IL|Northbrook%2C%20IL");
  });

  it("omits the waypoints param when there are zero ordered stops", () => {
    const url = buildGoogleMapsUrl({ start: "A", end: "B", orderedStops: [] });
    expect(url).not.toContain("waypoints=");
  });

  it("encodes special characters like & inside addresses", () => {
    const url = buildGoogleMapsUrl({
      start: "Lake Cook Rd & Waukegan Rd, IL",
      end: "B",
      orderedStops: [],
    });
    expect(url).toContain("origin=Lake%20Cook%20Rd%20%26%20Waukegan%20Rd%2C%20IL");
  });

  it("trims surrounding whitespace from inputs before encoding", () => {
    const url = buildGoogleMapsUrl({ start: "  A  ", end: " B ", orderedStops: ["  C "] });
    expect(url).toContain("origin=A");
    expect(url).toContain("destination=B");
    expect(url).toContain("waypoints=C");
  });
});
