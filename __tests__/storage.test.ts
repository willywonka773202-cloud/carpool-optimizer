import { beforeEach, describe, expect, it } from "vitest";
import { listSavedRoutes, saveRoute, deleteRoute, clearAll, STORAGE_KEY } from "../lib/storage";

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
});
