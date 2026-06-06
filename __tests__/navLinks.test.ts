import { describe, expect, it } from "vitest";
import { buildNavUrl, buildAppleMapsUrl, buildWazeUrl, navAppLabel } from "../lib/navLinks";

const input = {
  start: "100 Main St",
  end: "900 Lincoln High",
  orderedStops: ["450 Elm St", "88 Riverside Dr"],
};

describe("navLinks", () => {
  it("builds a Google Maps multi-stop URL with all waypoints", () => {
    const url = buildNavUrl("google", input);
    expect(url).toContain("https://www.google.com/maps/dir/?api=1");
    expect(url).toContain("origin=100%20Main%20St");
    expect(url).toContain("destination=900%20Lincoln%20High");
    expect(url).toContain("waypoints=450%20Elm%20St|88%20Riverside%20Dr");
  });

  it("builds an Apple Maps URL chaining stops then end with +to:", () => {
    const url = buildAppleMapsUrl(input);
    expect(url).toContain("https://maps.apple.com/");
    expect(url).toContain("saddr=100%20Main%20St");
    expect(url).toContain("daddr=450%20Elm%20St+to:88%20Riverside%20Dr+to:900%20Lincoln%20High");
    expect(url).toContain("dirflg=d");
  });

  it("Waze navigates to the first stop (single-destination), or the end if no stops", () => {
    expect(buildWazeUrl(input)).toBe(
      "https://waze.com/ul?q=450%20Elm%20St&navigate=yes"
    );
    expect(buildWazeUrl({ start: "A", end: "Z", orderedStops: [] })).toBe(
      "https://waze.com/ul?q=Z&navigate=yes"
    );
  });

  it("ignores blank stops", () => {
    const url = buildNavUrl("google", { start: "A", end: "B", orderedStops: ["", "  "] });
    expect(url).not.toContain("waypoints=");
  });

  it("maps each app id to a human label", () => {
    expect(navAppLabel("google")).toBe("Google Maps");
    expect(navAppLabel("apple")).toBe("Apple Maps");
    expect(navAppLabel("waze")).toBe("Waze");
  });
});
