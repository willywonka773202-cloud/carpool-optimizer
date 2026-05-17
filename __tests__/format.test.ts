import { describe, it, expect } from "vitest";
import { formatEta, formatDistance } from "../lib/format";

describe("formatEta", () => {
  it("shows '—' for null/undefined/NaN", () => {
    expect(formatEta(null)).toBe("—");
    expect(formatEta(undefined)).toBe("—");
    expect(formatEta(Number.NaN)).toBe("—");
  });

  it("shows '0 min' for zero", () => {
    expect(formatEta(0)).toBe("0 min");
  });

  it("rounds to minutes under an hour", () => {
    expect(formatEta(60)).toBe("1 min");
    expect(formatEta(90)).toBe("2 min");      // rounded up from 1.5
    expect(formatEta(60 * 59)).toBe("59 min");
  });

  it("shows '1 h' on exact hour", () => {
    expect(formatEta(3600)).toBe("1 h");
    expect(formatEta(7200)).toBe("2 h");
  });

  it("shows 'h min' over an hour with leftover", () => {
    expect(formatEta(3600 + 60 * 12)).toBe("1 h 12 min");
    expect(formatEta(3600 * 2 + 60 * 5)).toBe("2 h 5 min");
  });

  it("handles negative values as '—'", () => {
    expect(formatEta(-5)).toBe("—");
  });
});

describe("formatDistance", () => {
  it("shows '—' for null/undefined/NaN/negative", () => {
    expect(formatDistance(null)).toBe("—");
    expect(formatDistance(undefined)).toBe("—");
    expect(formatDistance(Number.NaN)).toBe("—");
    expect(formatDistance(-1)).toBe("—");
  });

  it("uses ft when the distance is under 0.1 mi", () => {
    // 0.1 mi == 160.934 m == ~528 ft
    expect(formatDistance(30)).toBe("98 ft");   // round(30 * 3.28084) = 98
    expect(formatDistance(100)).toBe("328 ft");
    expect(formatDistance(150)).toBe("492 ft");
  });

  it("switches to mi at or above 0.1 mi with 1 decimal", () => {
    expect(formatDistance(161)).toBe("0.1 mi"); // 161 m ~ 0.1001 mi
    expect(formatDistance(1609)).toBe("1.0 mi");
    expect(formatDistance(16093)).toBe("10.0 mi");
  });

  it("zero returns '0 ft'", () => {
    expect(formatDistance(0)).toBe("0 ft");
  });
});
