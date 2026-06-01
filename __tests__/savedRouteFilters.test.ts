import { describe, expect, it } from "vitest";
import { filterSavedRoutes, matchesSavedRouteQuery } from "../lib/savedRouteFilters";
import type { SavedRoute } from "../lib/types";

const routes: SavedRoute[] = [
  {
    id: "upcoming-pinned",
    label: "Morning school run",
    start: "Home Base",
    end: "Lincoln High",
    stops: ["Ava House", "Ben House"],
    riderNames: ["Ava", "Ben"],
    createdAt: 1,
    isPinned: true,
    etaSeconds: 1800,
    distanceMeters: 12000,
    driveCount: 2,
    lastDrivenAt: 1770000000000,
    ridePlan: {
      driverName: "Will",
      driverNote: "Use the north pickup lane",
      rideDate: "2026-05-26",
      arrivalTime: "08:15",
      repeat: "weekdays",
      seatsAvailable: 4,
      reminderMinutes: 20,
      checklist: ["Fuel"],
    },
    routePreferences: {
      intent: "balanced",
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
      avoidReportedHazards: true,
    },
  },
  {
    id: "draft",
    label: "Soccer practice draft",
    start: "Office",
    end: "Fieldhouse",
    stops: ["Mia House"],
    createdAt: 2,
    ridePlan: {
      driverName: "Taylor",
      rideDate: "",
      arrivalTime: "",
      repeat: "none",
      seatsAvailable: 3,
      reminderMinutes: 0,
      checklist: ["Water"],
    },
  },
];

describe("savedRouteFilters", () => {
  it("matches queries across route label, rider names, and route metadata", () => {
    expect(matchesSavedRouteQuery(routes[0], "morning ava balanced")).toBe(true);
    expect(matchesSavedRouteQuery(routes[0], "north lane")).toBe(true);
    expect(matchesSavedRouteQuery(routes[0], "driven")).toBe(true);
    expect(matchesSavedRouteQuery(routes[0], "taylor")).toBe(false);
  });

  it("filters drafts by query", () => {
    expect(filterSavedRoutes(routes, "drafts", "soccer")).toEqual([routes[1]]);
  });

  it("filters upcoming routes using the supplied clock", () => {
    expect(
      filterSavedRoutes(routes, "upcoming", "will", new Date("2026-05-25T12:00:00"))
    ).toEqual([routes[0]]);
  });

  it("filters driven routes by saved drive history", () => {
    expect(filterSavedRoutes(routes, "driven", "")).toEqual([routes[0]]);
  });
});
