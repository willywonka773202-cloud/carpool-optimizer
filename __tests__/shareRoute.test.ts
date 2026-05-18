import { describe, expect, it } from "vitest";
import {
  decodeSharedRoute,
  encodeSharedRoute,
  SHARE_ROUTE_PARAM,
} from "../lib/shareRoute";

describe("shareRoute", () => {
  it("roundtrips route inputs with rider names", () => {
    const token = encodeSharedRoute({
      start: "123 Main St, Phoenix, AZ",
      end: "Sky Harbor Terminal 4",
      stops: ["Alice House", "Bob & Carol's"],
      riderNames: ["Alice", null],
    });

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSharedRoute(token)).toEqual({
      start: "123 Main St, Phoenix, AZ",
      end: "Sky Harbor Terminal 4",
      stops: ["Alice House", "Bob & Carol's"],
      riderNames: ["Alice", null],
    });
  });

  it("trims empty stops and normalizes blank rider names to null", () => {
    const token = encodeSharedRoute({
      start: " Home ",
      end: " School ",
      stops: [" Stop 1 ", "", "   "],
      riderNames: [" Rider ", "ignored", "   "],
    });

    expect(decodeSharedRoute(token)).toEqual({
      start: "Home",
      end: "School",
      stops: ["Stop 1"],
      riderNames: ["Rider"],
    });
  });

  it("rejects malformed tokens instead of throwing", () => {
    expect(decodeSharedRoute("not valid base64!!")).toBeNull();
    expect(decodeSharedRoute("")).toBeNull();
  });

  it("rejects payloads missing required route fields", () => {
    const malformed = btoa(JSON.stringify({ v: 1, start: "A", stops: ["C"] }));
    expect(decodeSharedRoute(malformed)).toBeNull();
  });

  it("exports the query parameter name used by the page", () => {
    expect(SHARE_ROUTE_PARAM).toBe("route");
  });
});
