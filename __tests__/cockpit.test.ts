import { describe, expect, it } from "vitest";
import {
  MIN_MAP_DVH,
  STAGE_ORDER,
  canOptimizeInputs,
  isStageReachable,
  mapDvhForStage,
  nextStageForLoadedRoute,
} from "../lib/cockpit";
import type { SavedRoute } from "../lib/types";

const baseRoute: SavedRoute = {
  id: "r1",
  label: "Route",
  start: "A",
  end: "B",
  stops: ["S1"],
  createdAt: 1,
};

describe("cockpit stage flow", () => {
  it("orders stages build → tune → go", () => {
    expect(STAGE_ORDER).toEqual(["build", "tune", "go"]);
  });

  it("shrinks the map toward Go but never below the minimum (stays visible)", () => {
    expect(mapDvhForStage("build")).toBe(32);
    expect(mapDvhForStage("tune")).toBe(30);
    expect(mapDvhForStage("go")).toBe(28);
    // Go is the smallest, and the documented minimum equals it.
    expect(MIN_MAP_DVH).toBe(28);
    for (const stage of STAGE_ORDER) {
      expect(mapDvhForStage(stage)).toBeGreaterThanOrEqual(MIN_MAP_DVH);
    }
  });

  it("lands a previously-optimized route in TUNE and a bare draft in BUILD", () => {
    expect(nextStageForLoadedRoute({ ...baseRoute, etaSeconds: 1200 })).toBe("tune");
    expect(nextStageForLoadedRoute({ ...baseRoute, source: "ors" })).toBe("tune");
    expect(nextStageForLoadedRoute({ etaSeconds: undefined, source: undefined })).toBe("build");
  });

  it("enables optimize only with a start, an end, and at least one non-blank stop", () => {
    expect(canOptimizeInputs({ start: "A", end: "B", stops: ["S1"] })).toBe(true);
    // A blank trailing stop is still enabled (validateRouteInputs reports the precise error).
    expect(canOptimizeInputs({ start: "A", end: "B", stops: ["S1", ""] })).toBe(true);
    expect(canOptimizeInputs({ start: " ", end: "B", stops: ["S1"] })).toBe(false);
    expect(canOptimizeInputs({ start: "A", end: "", stops: ["S1"] })).toBe(false);
    expect(canOptimizeInputs({ start: "A", end: "B", stops: ["", "  "] })).toBe(false);
  });

  it("locks Go until a route is optimized; build/tune always reachable", () => {
    expect(isStageReachable("go", false)).toBe(false);
    expect(isStageReachable("go", true)).toBe(true);
    expect(isStageReachable("build", false)).toBe(true);
    expect(isStageReachable("tune", false)).toBe(true);
  });
});
