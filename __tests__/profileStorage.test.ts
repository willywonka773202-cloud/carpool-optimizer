import { beforeEach, describe, expect, it } from "vitest";
import {
  PROFILE_STORAGE_KEY,
  clearTripDefaults,
  getProfile,
  saveRiderGroup,
  saveTripDefaults,
  setHomeAddress,
  updateRiderGroup,
} from "../lib/profileStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("profileStorage", () => {
  it("saves and loads reusable trip defaults", () => {
    saveTripDefaults({
      driverName: "Will",
      seatsAvailable: 5,
      reminderMinutes: 30,
      repeat: "weekdays",
      checklist: ["Charge", "Water"],
      routePreferences: {
        intent: "balanced",
        avoidTolls: true,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: true,
      },
    });

    expect(getProfile().tripDefaults).toEqual({
      driverName: "Will",
      seatsAvailable: 5,
      reminderMinutes: 30,
      repeat: "weekdays",
      checklist: ["Charge", "Water"],
      routePreferences: {
        intent: "balanced",
        avoidTolls: true,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: true,
      },
    });
  });

  it("clears trip defaults without removing other profile data", () => {
    setHomeAddress("123 Main St");
    saveTripDefaults({
      driverName: "Will",
      seatsAvailable: 4,
      reminderMinutes: 20,
      repeat: "none",
      checklist: ["Fuel"],
      routePreferences: {
        intent: "fastest",
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: false,
      },
    });

    const profile = clearTripDefaults();
    expect(profile.homeAddress).toBe("123 Main St");
    expect(profile.tripDefaults).toBeUndefined();
  });

  it("normalizes legacy trip defaults when route preferences are missing", () => {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        homeAddress: "123 Main St",
        groups: [],
        tripDefaults: {
          driverName: "Will",
          seatsAvailable: 99,
          reminderMinutes: 15,
          repeat: "daily",
          checklist: [],
        },
      })
    );

    expect(getProfile().tripDefaults).toEqual({
      driverName: "Will",
      seatsAvailable: 8,
      reminderMinutes: 15,
      repeat: "daily",
      checklist: ["Fuel or charge", "Confirm riders", "Pack pickup essentials"],
      routePreferences: {
        intent: "fastest",
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: false,
      },
    });
  });

  it("updates a saved rider group from the latest route draft", async () => {
    const group = saveRiderGroup({
      label: "Weekday riders",
      stops: ["Ava", "Noah"],
      riderNames: ["Ava", null],
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const profile = updateRiderGroup(group.id, {
      stops: [" Ava ", "Mia", ""],
      riderNames: ["Ava", "Mia", "ignored"],
    });

    expect(profile.groups).toHaveLength(1);
    expect(profile.groups[0]).toMatchObject({
      id: group.id,
      label: "Weekday riders",
      stops: ["Ava", "Mia"],
      riderNames: ["Ava", "Mia"],
    });
    expect(profile.groups[0].updatedAt).toBeGreaterThan(group.createdAt);
  });

  it("throws when updating an unknown rider group", () => {
    expect(() =>
      updateRiderGroup("missing-group", {
        stops: ["Ava"],
      })
    ).toThrow(/not found/i);
  });
});
