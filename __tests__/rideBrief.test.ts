import { describe, expect, it } from "vitest";
import { DEFAULT_RIDE_PLAN } from "../lib/ridePlan";
import { buildRideBrief, buildSavedRouteBrief } from "../lib/rideBrief";
import type { RidePlan, SavedRoute } from "../lib/types";

function makePlan(partial: Partial<RidePlan>): RidePlan {
  return { ...DEFAULT_RIDE_PLAN, ...partial };
}

describe("rideBrief", () => {
  it("builds a shareable driver brief from an optimized route", () => {
    const brief = buildRideBrief({
      start: "Home",
      end: "School",
      optimized: {
        orderedStops: ["Stop A", "Stop B"],
        etaSeconds: 1800,
        distanceMeters: 10000,
      },
      riderNames: ["Ava", "Noah"],
      ridePlan: makePlan({
        driverName: "Will",
        driverNote: "Use the north pickup lane",
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        checklist: ["Fuel", "Snacks"],
      }),
      routePreferences: {
        intent: "balanced",
        avoidTolls: true,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: true,
      },
    });

    expect(brief).toContain("Carpool driver brief");
    expect(brief).toContain("Driver: Will");
    expect(brief).toContain("Note: Use the north pickup lane");
    expect(brief).toContain("Route: Home -> School");
    expect(brief).toContain("Route style: balanced · avoid tolls, reported hazards");
    expect(brief).toContain("1. Ava - Stop A");
    expect(brief).toContain("- Snacks");
  });

  it("builds a brief directly from a saved route", () => {
    const route: SavedRoute = {
      id: "saved-1",
      label: "Morning School",
      start: "Home",
      end: "School",
      stops: ["Stop A"],
      riderNames: ["Ava"],
      createdAt: 123,
      etaSeconds: 1800,
      distanceMeters: 10000,
      source: "ors",
      ridePlan: makePlan({
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        checklist: ["Fuel"],
      }),
      routePreferences: {
        intent: "fastest",
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: false,
      },
    };

    const brief = buildSavedRouteBrief(route);

    expect(brief).toContain("Stops total: 1");
    expect(brief).toContain("1. Ava - Stop A");
    expect(brief).toContain("Checklist:");
  });
});
