import { describe, expect, it } from "vitest";
import { buildRouteMonitor } from "../lib/routeMonitor";

describe("buildRouteMonitor", () => {
  it("summarizes a scheduled optimized route", () => {
    const monitor = buildRouteMonitor({
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B"],
      riderNames: ["Ava", "Noah"],
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        repeat: "weekdays",
        seatsAvailable: 4,
        reminderMinutes: 20,
        checklist: ["Snacks", "Water"],
      },
      etaSeconds: 1800,
      distanceMeters: 12000,
      routeLabel: "Balanced",
      routeOptionCount: 3,
    });

    expect(monitor.status).toBe("ready");
    expect(monitor.badgeLabel).toBe("Ready to drive");
    expect(monitor.headline).toMatch(/^Leave /);
    expect(monitor.subheadline).toMatch(/^Arrive /);
    expect(monitor.routeLine).toContain("Balanced");
    expect(monitor.routeLine).toContain("3 options");
    expect(monitor.seatLine).toBe("2/4 seats");
    expect(monitor.checklistLine).toBe("2/2 prep ready");
    expect(monitor.riderLine).toBe("2/2 riders named");
  });

  it("falls back to missing-input guidance for drafts", () => {
    const monitor = buildRouteMonitor({
      start: "",
      end: "School",
      stops: [""],
      riderNames: [null],
      ridePlan: {
        driverName: "",
        rideDate: "",
        arrivalTime: "",
        repeat: "none",
        seatsAvailable: 4,
        reminderMinutes: 0,
        checklist: [""],
      },
    });

    expect(monitor.status).toBe("draft");
    expect(monitor.badgeLabel).toBe("Draft route");
    expect(monitor.headline).toBe("Add a start point");
    expect(monitor.subheadline).toBe("2 inputs missing");
    expect(monitor.routeLine).toBe("0 stops queued");
    expect(monitor.checklistLine).toBe("0/1 prep ready");
    expect(monitor.riderLine).toBe("No riders queued");
    expect(monitor.arrivalLine).toBe("Not scheduled");
    expect(monitor.reminderLine).toBe("Off");
  });

  it("surfaces workflow attention before a route is optimized", () => {
    const monitor = buildRouteMonitor({
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B", "Stop C"],
      riderNames: ["Ava", null, "Mia"],
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-26",
        arrivalTime: "08:00",
        repeat: "none",
        seatsAvailable: 2,
        reminderMinutes: 0,
        checklist: ["Snacks", ""],
      },
    });

    expect(monitor.status).toBe("attention");
    expect(monitor.badgeLabel).toBe("Needs attention");
    expect(monitor.headline).toBe("Capacity is short by 1 seat");
    expect(monitor.subheadline).toBe("Driver workflow still needs cleanup.");
    expect(monitor.routeLine).toBe("3 stops queued");
    expect(monitor.seatLine).toBe("2/2 seats");
    expect(monitor.checklistLine).toBe("1/2 prep ready");
    expect(monitor.riderLine).toBe("2/3 riders named");
  });
});
