import { describe, expect, it } from "vitest";
import { getRideReadiness } from "../lib/rideReadiness";
import { DEFAULT_RIDE_PLAN } from "../lib/ridePlan";

describe("rideReadiness", () => {
  it("marks an incomplete form as draft with missing core inputs", () => {
    const readiness = getRideReadiness({
      start: "",
      end: "School",
      stops: [""],
      riderNames: [null],
      ridePlan: DEFAULT_RIDE_PLAN,
    });

    expect(readiness.status).toBe("draft");
    expect(readiness.missingCoreInputs).toEqual([
      "Add a start point",
      "Add at least one rider stop",
    ]);
  });

  it("surfaces attention items for capacity, schedule, rider names, and checklist gaps", () => {
    const readiness = getRideReadiness({
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B", "Stop C"],
      riderNames: ["Alice", null, ""],
      ridePlan: {
        ...DEFAULT_RIDE_PLAN,
        seatsAvailable: 2,
        checklist: ["Fuel", ""],
      },
    });

    expect(readiness.status).toBe("attention");
    expect(readiness.isOverCapacity).toBe(true);
    expect(readiness.attentionItems).toEqual([
      "Capacity is short by 1 seat",
      "Add a ride date and arrival time",
      "Name 2 stops for a clearer drop-off order",
      "Finish 1 checklist item",
    ]);
  });

  it("marks a fully prepared route as ready", () => {
    const readiness = getRideReadiness({
      start: "Home",
      end: "School",
      stops: ["Stop A", "Stop B"],
      riderNames: ["Alice", "Ben"],
      ridePlan: {
        ...DEFAULT_RIDE_PLAN,
        rideDate: "2026-05-26",
        arrivalTime: "08:15",
        repeat: "weekdays",
        seatsAvailable: 4,
        reminderMinutes: 20,
        checklist: ["Fuel", "Snacks"],
      },
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.hasSchedule).toBe(true);
    expect(readiness.attentionItems).toEqual([]);
    expect(readiness.reminderLabel).toMatch(/:|AM|PM/);
  });
});
