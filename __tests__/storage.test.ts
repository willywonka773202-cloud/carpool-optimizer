import { beforeEach, describe, expect, it } from "vitest";
import {
  listSavedRoutes,
  saveRoute,
  updateRoute,
  renameRoute,
  deleteRoute,
  clearAll,
  STORAGE_KEY,
} from "../lib/storage";

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
      source: "google",
    });
    expect(saved.etaSeconds).toBe(1200);
    expect(saved.distanceMeters).toBe(8000);
    expect(saved.source).toBe("google");
  });

  it("save omits optional summary fields when not provided", () => {
    const saved = saveRoute({ label: "X", start: "A", end: "B", stops: ["C"] });
    expect(saved.etaSeconds).toBeUndefined();
    expect(saved.distanceMeters).toBeUndefined();
    expect(saved.source).toBeUndefined();
    expect(saved.riderNames).toBeUndefined();
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
});
