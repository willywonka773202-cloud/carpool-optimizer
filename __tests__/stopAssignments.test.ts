import { describe, expect, it } from "vitest";
import { collectStopAssignments, matchAssignmentsInOrder } from "../lib/stopAssignments";

describe("stopAssignments", () => {
  it("filters blank stops while preserving rider and coord alignment", () => {
    const assignments = collectStopAssignments(
      ["  Stop A  ", "", "Stop B"],
      ["Alice", "Ignore me", null],
      [{ lat: 1, lng: 2 }, { lat: 5, lng: 6 }, null]
    );

    expect(assignments).toEqual([
      {
        address: "Stop A",
        riderName: "Alice",
        coord: { lat: 1, lng: 2 },
      },
      {
        address: "Stop B",
        riderName: null,
        coord: null,
      },
    ]);
  });

  it("matches duplicate stops in order instead of collapsing them", () => {
    const assignments = collectStopAssignments(
      ["Stop A", "Stop B", "Stop A"],
      ["First A", "Bee", "Second A"],
      [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }]
    );

    expect(matchAssignmentsInOrder(["Stop A", "Stop A", "Stop B"], assignments)).toEqual([
      {
        address: "Stop A",
        riderName: "First A",
        coord: { lat: 1, lng: 1 },
      },
      {
        address: "Stop A",
        riderName: "Second A",
        coord: { lat: 3, lng: 3 },
      },
      {
        address: "Stop B",
        riderName: "Bee",
        coord: { lat: 2, lng: 2 },
      },
    ]);
  });
});
