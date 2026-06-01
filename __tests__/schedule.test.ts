import { describe, expect, it } from "vitest";
import { buildCarpoolCalendarEvent, buildSavedRouteCalendarEvent } from "../lib/calendar";
import { DEFAULT_RIDE_PLAN } from "../lib/ridePlan";
import {
  getRideScheduleSnapshot,
  getRideScheduleStatus,
  listUpcomingSavedRoutes,
} from "../lib/schedule";
import type { OptimizedRoute, RidePlan, SavedRoute } from "../lib/types";

function makePlan(partial: Partial<RidePlan>): RidePlan {
  return { ...DEFAULT_RIDE_PLAN, ...partial };
}

describe("schedule", () => {
  it("computes depart and reminder timing for a one-time ride", () => {
    const ridePlan = makePlan({
      rideDate: "2026-05-26",
      arrivalTime: "08:15",
      reminderMinutes: 20,
      repeat: "none",
    });

    const snapshot = getRideScheduleSnapshot(ridePlan, 1800, new Date("2026-05-25T12:00:00"));

    expect(snapshot?.arrivalAt.toISOString()).toBe("2026-05-26T13:15:00.000Z");
    expect(snapshot?.departAt?.toISOString()).toBe("2026-05-26T12:45:00.000Z");
    expect(snapshot?.reminderAt?.toISOString()).toBe("2026-05-26T12:25:00.000Z");
    expect(snapshot?.isUpcoming).toBe(true);
  });

  it("rolls weekday repeats forward to the next business day", () => {
    const ridePlan = makePlan({
      rideDate: "2026-05-20",
      arrivalTime: "07:30",
      repeat: "weekdays",
    });

    const snapshot = getRideScheduleSnapshot(ridePlan, 0, new Date("2026-05-23T15:00:00"));

    expect(snapshot?.arrivalAt.toISOString()).toBe("2026-05-25T12:30:00.000Z");
  });

  it("returns null when date or time is incomplete", () => {
    const ridePlan = makePlan({ rideDate: "", arrivalTime: "08:00" });
    expect(getRideScheduleSnapshot(ridePlan, 1200)).toBeNull();
  });

  it("lists upcoming saved routes sorted by arrival time", () => {
    const routes: SavedRoute[] = [
      {
        id: "later",
        label: "Later",
        start: "Home",
        end: "School",
        stops: ["Stop B"],
        createdAt: 1,
        etaSeconds: 900,
        ridePlan: makePlan({
          rideDate: "2026-05-26",
          arrivalTime: "08:30",
          repeat: "none",
        }),
      },
      {
        id: "first",
        label: "First",
        start: "Home",
        end: "School",
        stops: ["Stop A"],
        createdAt: 2,
        etaSeconds: 1200,
        ridePlan: makePlan({
          rideDate: "2026-05-26",
          arrivalTime: "08:10",
          repeat: "none",
        }),
      },
      {
        id: "missing-plan",
        label: "Missing",
        start: "Home",
        end: "School",
        stops: ["Stop C"],
        createdAt: 3,
      },
    ];

    const upcoming = listUpcomingSavedRoutes(routes, new Date("2026-05-25T12:00:00"));

    expect(upcoming.map((entry) => entry.route.id)).toEqual(["first", "later"]);
    expect(upcoming[0]?.schedule.departAt?.toISOString()).toBe("2026-05-26T12:50:00.000Z");
  });

  it("describes reminder, depart, and late schedule states", () => {
    const ridePlan = makePlan({
      rideDate: "2026-05-26",
      arrivalTime: "08:15",
      reminderMinutes: 20,
      repeat: "none",
    });
    const snapshot = getRideScheduleSnapshot(ridePlan, 1800, new Date("2026-05-25T12:00:00"));
    expect(snapshot).not.toBeNull();

    expect(
      getRideScheduleStatus(snapshot!, new Date("2026-05-26T12:30:00.000Z"))
    ).toMatchObject({
      tone: "reminder",
      headline: "Reminder window",
    });

    expect(
      getRideScheduleStatus(snapshot!, new Date("2026-05-26T12:46:00.000Z"))
    ).toMatchObject({
      tone: "depart",
      headline: "Leave now",
    });

    expect(
      getRideScheduleStatus(snapshot!, new Date("2026-05-26T13:16:00.000Z"))
    ).toMatchObject({
      tone: "late",
      headline: "Arrival time passed",
    });
  });
});

describe("calendar export", () => {
  it("builds an ICS event with route and checklist details", () => {
    const optimized: OptimizedRoute = {
      orderedStops: ["Stop A", "Stop B"],
      etaSeconds: 1800,
      distanceMeters: 10000,
      source: "ors",
    };

    const ics = buildCarpoolCalendarEvent({
      start: "Home",
      end: "School",
      optimized,
      ridePlan: makePlan({
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        checklist: ["Fuel", "Snacks"],
      }),
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Carpool: Home to School");
    expect(ics).toContain("Stops: Stop A | Stop B");
    expect(ics).toContain("Checklist: Fuel | Snacks");
  });

  it("builds an ICS event directly from a saved route", () => {
    const ics = buildSavedRouteCalendarEvent({
      id: "saved-1",
      label: "Morning School",
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B"],
      createdAt: 123,
      etaSeconds: 1800,
      distanceMeters: 10000,
      source: "ors",
      ridePlan: makePlan({
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        checklist: ["Fuel", "Snacks"],
      }),
    });

    expect(ics).toContain("SUMMARY:Carpool: Home to School");
    expect(ics).toContain("Stops: Stop A | Stop B");
    expect(ics).toContain("Reminder: 20 minutes before departure");
  });
});
