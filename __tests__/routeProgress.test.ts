import { describe, expect, it } from "vitest";
import {
  buildChecklistProgressKey,
  buildStopProgressKey,
  normalizeSavedRouteProgress,
  resetSavedRouteProgress,
  summarizeSavedRouteProgress,
  toggleSavedRouteProgressKey,
} from "../lib/routeProgress";

describe("routeProgress", () => {
  it("normalizes progress keys against current stops and checklist", () => {
    expect(
      normalizeSavedRouteProgress(
        {
          completedStopKeys: ["0:Stop A", "4:Wrong", "0:Stop A"],
          completedChecklistKeys: ["1:Snacks", "3:Wrong", "1:Snacks"],
          lastUpdatedAt: 1234,
        },
        ["Stop A", "Stop B"],
        ["Fuel", "Snacks"]
      )
    ).toEqual({
      completedStopKeys: ["0:Stop A"],
      completedChecklistKeys: ["1:Snacks"],
      lastUpdatedAt: 1234,
    });
  });

  it("toggles progress keys and stamps the update time", () => {
    const first = toggleSavedRouteProgressKey(
      { completedStopKeys: [], completedChecklistKeys: [] },
      "stop",
      buildStopProgressKey(0, "Stop A")
    );
    expect(first.completedStopKeys).toEqual(["0:Stop A"]);
    expect(first.lastUpdatedAt).toBeTypeOf("number");

    const second = toggleSavedRouteProgressKey(
      first,
      "checklist",
      buildChecklistProgressKey(1, "Fuel")
    );
    expect(second.completedChecklistKeys).toEqual(["1:Fuel"]);

    const third = toggleSavedRouteProgressKey(second, "stop", buildStopProgressKey(0, "Stop A"));
    expect(third.completedStopKeys).toEqual([]);
  });

  it("resets progress back to an empty staged state", () => {
    expect(resetSavedRouteProgress()).toEqual({
      completedStopKeys: [],
      completedChecklistKeys: [],
    });
  });

  it("summarizes staged, in-progress, and complete routes", () => {
    const base = {
      id: "route-1",
      label: "Morning",
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B"],
      createdAt: 1,
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:00",
        repeat: "none" as const,
        seatsAvailable: 4,
        reminderMinutes: 15,
        checklist: ["Fuel"],
      },
    };

    expect(summarizeSavedRouteProgress(base).status).toBe("staged");
    expect(
      summarizeSavedRouteProgress({
        ...base,
        progress: {
          completedStopKeys: ["0:Stop A"],
          completedChecklistKeys: [],
        },
      }).status
    ).toBe("in-progress");
    expect(
      summarizeSavedRouteProgress({
        ...base,
        progress: {
          completedStopKeys: ["0:Stop A", "1:Stop B"],
          completedChecklistKeys: ["0:Fuel"],
        },
      }).status
    ).toBe("complete");
  });
});
