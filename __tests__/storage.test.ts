import { beforeEach, describe, expect, it } from "vitest";
import {
  listSavedRoutes,
  recordRouteDrive,
  saveRoute,
  toggleRoutePin,
  updateRoute,
  renameRoute,
  deleteRoute,
  clearAll,
  STORAGE_KEY,
} from "../lib/storage";
import { DEFAULT_RIDE_PLAN } from "../lib/ridePlan";

beforeEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  it("save -> list roundtrips with id and createdAt", () => {
    const saved = saveRoute({ label: "School Run", start: "Home", end: "School", stops: ["A", "B"] });
    expect(saved.id).toMatch(/[0-9a-f-]{36}/i);
    expect(saved.createdAt).toBeGreaterThan(0);

    const list = listSavedRoutes();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("School Run");
    expect(list[0].stops).toEqual(["A", "B"]);
  });

  it("lists newest first", async () => {
    saveRoute({ label: "First", start: "A", end: "B", stops: ["C"] });
    await new Promise((r) => setTimeout(r, 5));
    saveRoute({ label: "Second", start: "A", end: "B", stops: ["C"] });
    const list = listSavedRoutes();
    expect(list[0].label).toBe("Second");
    expect(list[1].label).toBe("First");
  });

  it("deletes by id", () => {
    const a = saveRoute({ label: "A", start: "x", end: "y", stops: ["z"] });
    saveRoute({ label: "B", start: "x", end: "y", stops: ["z"] });
    deleteRoute(a.id);
    expect(listSavedRoutes()).toHaveLength(1);
    expect(listSavedRoutes()[0].label).toBe("B");
  });

  it("survives a corrupt entry without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(listSavedRoutes()).toEqual([]);
  });

  it("rejects payloads containing apiKey", () => {
    expect(() =>
      // @ts-expect-error intentional misuse for security test
      saveRoute({ label: "Bad", start: "x", end: "y", stops: ["z"], apiKey: "AIzaSecret" })
    ).toThrow(/forbidden field/i);
  });

  it("rejects payloads containing directionsResult", () => {
    expect(() =>
      // @ts-expect-error intentional misuse for security test
      saveRoute({ label: "Bad", start: "x", end: "y", stops: ["z"], directionsResult: {} })
    ).toThrow(/forbidden field/i);
  });

  it("clearAll empties the list", () => {
    saveRoute({ label: "x", start: "a", end: "b", stops: ["c"] });
    clearAll();
    expect(listSavedRoutes()).toEqual([]);
  });

  it("update changes fields, bumps updatedAt, preserves id and createdAt", async () => {
    const saved = saveRoute({ label: "Old", start: "A", end: "B", stops: ["C"] });
    await new Promise((r) => setTimeout(r, 5));
    const updated = updateRoute(saved.id, { label: "New", stops: ["X", "Y"] });
    expect(updated.id).toBe(saved.id);
    expect(updated.createdAt).toBe(saved.createdAt);
    expect(updated.updatedAt).toBeGreaterThan(saved.createdAt);
    expect(updated.label).toBe("New");
    expect(updated.stops).toEqual(["X", "Y"]);
  });

  it("rename is a label-only update", () => {
    const saved = saveRoute({ label: "Old", start: "A", end: "B", stops: ["C"] });
    const renamed = renameRoute(saved.id, "Brand New");
    expect(renamed.label).toBe("Brand New");
    expect(renamed.id).toBe(saved.id);
    expect(renamed.stops).toEqual(["C"]);
  });

  it("update throws when id is unknown", () => {
    expect(() => updateRoute("not-a-real-id", { label: "X" })).toThrow(/not found/i);
  });

  it("update rejects forbidden fields", () => {
    const saved = saveRoute({ label: "X", start: "A", end: "B", stops: ["C"] });
    expect(() =>
      // @ts-expect-error intentional misuse
      updateRoute(saved.id, { apiKey: "AIzaSecret" })
    ).toThrow(/forbidden field/i);
  });

  it("save accepts riderNames when length matches stops", () => {
    const saved = saveRoute({
      label: "School",
      start: "A",
      end: "B",
      stops: ["S1", "S2"],
      riderNames: ["Alice", null],
    });
    expect(saved.riderNames).toEqual(["Alice", null]);
  });

  it("save rejects riderNames when length mismatches stops", () => {
    expect(() =>
      saveRoute({
        label: "Bad",
        start: "A",
        end: "B",
        stops: ["S1", "S2"],
        riderNames: ["only-one"],
      })
    ).toThrow(/length/i);
  });

  it("save persists optional summary fields (eta, distance, source) when present", () => {
    const saved = saveRoute({
      label: "X",
      start: "A",
      end: "B",
      stops: ["C"],
      etaSeconds: 1200,
      distanceMeters: 8000,
      source: "ors",
    });
    expect(saved.etaSeconds).toBe(1200);
    expect(saved.distanceMeters).toBe(8000);
    expect(saved.source).toBe("ors");
  });

  it("save persists normalized route progress metadata when present", () => {
    const saved = saveRoute({
      label: "School",
      start: "Home",
      end: "Campus",
      stops: ["Stop A", "Stop B"],
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-23",
        arrivalTime: "08:00",
        repeat: "none",
        seatsAvailable: 4,
        reminderMinutes: 15,
        checklist: ["Fuel", "Snacks"],
      },
      progress: {
        completedStopKeys: ["0:Stop A", "8:Wrong"],
        completedChecklistKeys: ["1:Snacks", "4:Wrong"],
        lastUpdatedAt: 1234,
      },
    });

    expect(saved.progress).toEqual({
      completedStopKeys: ["0:Stop A"],
      completedChecklistKeys: ["1:Snacks"],
      lastUpdatedAt: 1234,
    });
  });

  it("save persists ride plan metadata when present", () => {
    const saved = saveRoute({
      label: "Practice carpool",
      start: "Home",
      end: "Home",
      stops: ["Gym"],
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-23",
        arrivalTime: "16:30",
        repeat: "weekdays",
        seatsAvailable: 4,
        reminderMinutes: 20,
        checklist: ["Snacks", "Water"],
      },
    });
    expect(saved.ridePlan).toEqual({
      driverName: "Will",
      rideDate: "2026-05-23",
      arrivalTime: "16:30",
      repeat: "weekdays",
      seatsAvailable: 4,
      reminderMinutes: 20,
      checklist: ["Snacks", "Water"],
    });
    expect(listSavedRoutes()[0].ridePlan?.repeat).toBe("weekdays");
  });

  it("save persists normalized driver notes with ride plan metadata", () => {
    const saved = saveRoute({
      label: "Practice carpool",
      start: "Home",
      end: "Home",
      stops: ["Gym"],
      ridePlan: {
        driverName: "Will",
        driverNote: "  Use the north pickup lane  ",
        rideDate: "2026-05-23",
        arrivalTime: "16:30",
        repeat: "none",
        seatsAvailable: 4,
        reminderMinutes: 20,
        checklist: ["Water"],
      },
    });

    expect(saved.ridePlan?.driverNote).toBe("Use the north pickup lane");
    expect(listSavedRoutes()[0].ridePlan?.driverNote).toBe("Use the north pickup lane");
  });

  it("save persists route preferences metadata when present", () => {
    const saved = saveRoute({
      label: "School",
      start: "Home",
      end: "Campus",
      stops: ["Stop A"],
      routePreferences: {
        intent: "balanced",
        avoidTolls: true,
        avoidHighways: false,
        avoidFerries: false,
        avoidReportedHazards: true,
      },
    });
    expect(saved.routePreferences).toEqual({
      intent: "balanced",
      avoidTolls: true,
      avoidHighways: false,
      avoidFerries: false,
      avoidReportedHazards: true,
    });
    expect(listSavedRoutes()[0].routePreferences?.intent).toBe("balanced");
  });

  it("normalizes legacy ride plans without checklist when loading from storage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          label: "Legacy route",
          start: "Home",
          end: "School",
          stops: ["Stop A"],
          createdAt: 123,
          ridePlan: {
            driverName: "Will",
            rideDate: "2026-05-23",
            arrivalTime: "08:00",
            repeat: "weekdays",
            seatsAvailable: 4,
            reminderMinutes: 15,
          },
        },
      ])
    );

    expect(listSavedRoutes()[0].ridePlan?.checklist).toEqual(DEFAULT_RIDE_PLAN.checklist);
  });

  it("save omits optional summary fields when not provided", () => {
    const saved = saveRoute({ label: "X", start: "A", end: "B", stops: ["C"] });
    expect(saved.etaSeconds).toBeUndefined();
    expect(saved.distanceMeters).toBeUndefined();
    expect(saved.source).toBeUndefined();
    expect(saved.riderNames).toBeUndefined();
    expect(saved.ridePlan).toBeUndefined();
  });

  it("update can clear route summary fields back to a draft", () => {
    const saved = saveRoute({
      label: "School",
      start: "Home",
      end: "Campus",
      stops: ["Stop A"],
      etaSeconds: 900,
      distanceMeters: 3200,
      source: "ors",
    });

    const updated = updateRoute(saved.id, {
      etaSeconds: undefined,
      distanceMeters: undefined,
      source: undefined,
    });

    expect(updated.etaSeconds).toBeUndefined();
    expect(updated.distanceMeters).toBeUndefined();
    expect(updated.source).toBeUndefined();
    expect(listSavedRoutes()[0].etaSeconds).toBeUndefined();
  });

  it("update re-normalizes progress when stops or checklist change", () => {
    const saved = saveRoute({
      label: "School",
      start: "Home",
      end: "Campus",
      stops: ["Stop A", "Stop B"],
      ridePlan: {
        driverName: "Will",
        rideDate: "2026-05-23",
        arrivalTime: "08:00",
        repeat: "none",
        seatsAvailable: 4,
        reminderMinutes: 15,
        checklist: ["Fuel", "Snacks"],
      },
      progress: {
        completedStopKeys: ["0:Stop A", "1:Stop B"],
        completedChecklistKeys: ["0:Fuel", "1:Snacks"],
        lastUpdatedAt: 1234,
      },
    });

    const updated = updateRoute(saved.id, {
      stops: ["Stop B"],
      ridePlan: {
        ...saved.ridePlan!,
        checklist: ["Snacks"],
      },
      progress: saved.progress,
    });

    expect(updated.progress).toEqual({
      completedStopKeys: [],
      completedChecklistKeys: [],
      lastUpdatedAt: undefined,
    });
  });

  it("listSavedRoutes sorts by updatedAt when present, falling back to createdAt", async () => {
    const a = saveRoute({ label: "A", start: "x", end: "y", stops: ["z"] });
    await new Promise((r) => setTimeout(r, 5));
    saveRoute({ label: "B", start: "x", end: "y", stops: ["z"] });
    await new Promise((r) => setTimeout(r, 5));
    updateRoute(a.id, { label: "A (edited)" });
    const list = listSavedRoutes();
    expect(list[0].label).toBe("A (edited)");
  });

  it("can toggle pinned state for a saved route", () => {
    const saved = saveRoute({ label: "School", start: "A", end: "B", stops: ["C"] });

    const pinned = toggleRoutePin(saved.id);
    expect(pinned.isPinned).toBe(true);
    expect(listSavedRoutes()[0].isPinned).toBe(true);

    const unpinned = toggleRoutePin(saved.id);
    expect(unpinned.isPinned).toBe(false);
  });

  it("prioritizes pinned routes ahead of newer unpinned routes", async () => {
    const older = saveRoute({ label: "Older", start: "A", end: "B", stops: ["C"] });
    await new Promise((r) => setTimeout(r, 5));
    saveRoute({ label: "Newer", start: "A", end: "B", stops: ["C"] });
    toggleRoutePin(older.id);

    const list = listSavedRoutes();
    expect(list[0].label).toBe("Older");
    expect(list[0].isPinned).toBe(true);
  });

  it("normalizes legacy routes without pin metadata as unpinned", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          label: "Legacy route",
          start: "Home",
          end: "School",
          stops: ["Stop A"],
          createdAt: 123,
        },
      ])
    );

    expect(listSavedRoutes()[0].isPinned).toBe(false);
  });

  it("records saved route drive history with count and last driven time", () => {
    const saved = saveRoute({ label: "School", start: "A", end: "B", stops: ["C"] });

    const first = recordRouteDrive(saved.id, 1234);
    expect(first.driveCount).toBe(1);
    expect(first.lastDrivenAt).toBe(1234);

    const second = recordRouteDrive(saved.id, 5678);
    expect(second.driveCount).toBe(2);
    expect(second.lastDrivenAt).toBe(5678);
    expect(listSavedRoutes()[0]).toMatchObject({
      id: saved.id,
      driveCount: 2,
      lastDrivenAt: 5678,
    });
  });

  it("normalizes malformed saved route drive history on load", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          label: "Legacy route",
          start: "Home",
          end: "School",
          stops: ["Stop A"],
          createdAt: 123,
          driveCount: -4,
          lastDrivenAt: "yesterday",
        },
        {
          id: "legacy-2",
          label: "Driven route",
          start: "Home",
          end: "School",
          stops: ["Stop B"],
          createdAt: 124,
          lastDrivenAt: 4444,
        },
      ])
    );

    expect(listSavedRoutes()).toEqual([
      expect.objectContaining({
        id: "legacy-2",
        driveCount: 1,
        lastDrivenAt: 4444,
      }),
      expect.not.objectContaining({
        driveCount: expect.any(Number),
        lastDrivenAt: expect.any(Number),
      }),
    ]);
  });
});
