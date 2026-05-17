import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(rel), "utf8");
}

describe("module boundaries", () => {
  it("optimizeRoute.ts never imports mockOptimizeRoute", () => {
    const src = read("lib/optimizeRoute.ts");
    expect(src).not.toMatch(/mockOptimizeRoute/);
  });

  it("mockOptimizeRoute.ts never imports optimizeRoute", () => {
    const src = read("lib/mockOptimizeRoute.ts");
    expect(src).not.toMatch(/from\s+["']\.\/optimizeRoute["']/);
  });

  it("mockOptimizeRoute.ts never imports any map or routing library", () => {
    const src = read("lib/mockOptimizeRoute.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/google\.maps/);
  });

  it("storage.ts only references apiKey and directionsResult inside FORBIDDEN_FIELDS", () => {
    const src = read("lib/storage.ts");
    const apiKeyMatches = src.match(/apiKey/g) ?? [];
    const directionsMatches = src.match(/directionsResult/g) ?? [];
    expect(apiKeyMatches.length).toBeLessThanOrEqual(1);
    expect(directionsMatches.length).toBeLessThanOrEqual(1);
  });

  it("format.ts is pure (no google, no optimizer imports)", () => {
    const src = read("lib/format.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
    expect(src).not.toMatch(/google\.maps/);
    expect(src).not.toMatch(/from\s+["']\.\/(?:mock)?[Oo]ptimizeRoute["']/);
  });

  it("waypointOps.ts is pure (no google, no optimizer imports)", () => {
    const src = read("lib/waypointOps.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
    expect(src).not.toMatch(/google\.maps/);
    expect(src).not.toMatch(/from\s+["']\.\/(?:mock)?[Oo]ptimizeRoute["']/);
  });

  it("handoffUrl.ts is pure (no map libs, no optimizer imports)", () => {
    const src = read("lib/handoffUrl.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/google\.maps/);
    expect(src).not.toMatch(/from\s+["']\.\/(?:mock)?[Oo]ptimizeRoute["']/);
  });

  it("orsAutocomplete.ts never imports map UI", () => {
    const src = read("lib/orsAutocomplete.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/@react-google-maps\/api/);
  });

  it("ORS helpers never import map UI", () => {
    for (const f of ["lib/orsGeocode.ts", "lib/orsOptimize.ts", "lib/orsDirections.ts"]) {
      const src = read(f);
      expect(src, `${f} should not import react-leaflet`).not.toMatch(/react-leaflet/);
      expect(src, `${f} should not import leaflet`).not.toMatch(/from\s+["']leaflet["']/);
      expect(src, `${f} should not import @react-google-maps/api`).not.toMatch(/@react-google-maps\/api/);
    }
  });

  it("nearestNeighbor.ts is pure (no map UI, no network)", () => {
    const src = read("lib/nearestNeighbor.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("distance.ts is pure (no map UI, no network)", () => {
    const src = read("lib/distance.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("geolocation.ts is pure (no map UI, no network)", () => {
    const src = read("lib/geolocation.ts");
    expect(src).not.toMatch(/react-leaflet/);
    expect(src).not.toMatch(/from\s+["']leaflet["']/);
    expect(src).not.toMatch(/openrouteservice/i);
    expect(src).not.toMatch(/\bfetch\(/);
  });
});
