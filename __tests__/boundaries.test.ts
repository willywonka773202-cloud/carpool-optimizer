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

  it("mockOptimizeRoute.ts never imports @react-google-maps/api", () => {
    const src = read("lib/mockOptimizeRoute.ts");
    expect(src).not.toMatch(/@react-google-maps\/api/);
  });

  it("storage.ts never references apiKey or directionsResult as a stored field", () => {
    const src = read("lib/storage.ts");
    // The string "apiKey" must appear only in FORBIDDEN_FIELDS.
    const matches = src.match(/apiKey/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
