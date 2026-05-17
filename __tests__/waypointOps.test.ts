import { describe, it, expect } from "vitest";
import {
  moveItemUp,
  moveItemDown,
  duplicateItem,
  removeItem,
} from "../lib/waypointOps";

describe("moveItemUp", () => {
  it("swaps with the previous index", () => {
    expect(moveItemUp(["a", "b", "c"], 1)).toEqual(["b", "a", "c"]);
    expect(moveItemUp(["a", "b", "c"], 2)).toEqual(["a", "c", "b"]);
  });

  it("no-ops at index 0 or out-of-range", () => {
    expect(moveItemUp(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(moveItemUp(["a", "b"], -1)).toEqual(["a", "b"]);
    expect(moveItemUp(["a", "b"], 9)).toEqual(["a", "b"]);
  });

  it("returns a NEW array (does not mutate)", () => {
    const arr = ["a", "b"];
    const out = moveItemUp(arr, 1);
    expect(out).not.toBe(arr);
    expect(arr).toEqual(["a", "b"]);
  });
});

describe("moveItemDown", () => {
  it("swaps with the next index", () => {
    expect(moveItemDown(["a", "b", "c"], 0)).toEqual(["b", "a", "c"]);
    expect(moveItemDown(["a", "b", "c"], 1)).toEqual(["a", "c", "b"]);
  });

  it("no-ops at last index or out-of-range", () => {
    expect(moveItemDown(["a", "b"], 1)).toEqual(["a", "b"]);
    expect(moveItemDown(["a", "b"], -1)).toEqual(["a", "b"]);
    expect(moveItemDown(["a", "b"], 9)).toEqual(["a", "b"]);
  });
});

describe("duplicateItem", () => {
  it("inserts a copy directly after the index", () => {
    expect(duplicateItem(["a", "b", "c"], 1)).toEqual(["a", "b", "b", "c"]);
    expect(duplicateItem(["a"], 0)).toEqual(["a", "a"]);
  });

  it("no-ops on out-of-range index", () => {
    expect(duplicateItem(["a", "b"], -1)).toEqual(["a", "b"]);
    expect(duplicateItem(["a", "b"], 9)).toEqual(["a", "b"]);
  });
});

describe("removeItem", () => {
  it("removes the entry at index", () => {
    expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("no-ops on out-of-range index", () => {
    expect(removeItem(["a", "b"], -1)).toEqual(["a", "b"]);
    expect(removeItem(["a", "b"], 5)).toEqual(["a", "b"]);
  });
});
