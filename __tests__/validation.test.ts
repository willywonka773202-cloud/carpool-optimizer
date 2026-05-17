import { describe, it, expect } from "vitest";
import { validateRouteInputs } from "../lib/validation";

describe("validateRouteInputs", () => {
  it("passes for valid inputs and trims waypoints", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: ["  C ", "D"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cleanedWaypoints).toEqual(["C", "D"]);
  });

  it("fails when start is blank", () => {
    const r = validateRouteInputs({ start: " ", end: "B", waypoints: ["C"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/start/i);
  });

  it("fails when end is blank", () => {
    const r = validateRouteInputs({ start: "A", end: "", waypoints: ["C"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/start.*end/i);
  });

  it("fails when both start and end are blank", () => {
    const r = validateRouteInputs({ start: "", end: "", waypoints: ["C"] });
    expect(r.ok).toBe(false);
  });

  it("fails when there are zero waypoints", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/at least one/i);
  });

  it("fails when any waypoint row is blank", () => {
    const r = validateRouteInputs({ start: "A", end: "B", waypoints: ["C", " "] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/empty/i);
  });
});
