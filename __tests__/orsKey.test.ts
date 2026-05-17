import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveApiKey, DEV_KEY_STORAGE_KEY } from "../lib/orsKey";

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveApiKey (OpenRouteService)", () => {
  it("prefers the env key", () => {
    expect(
      resolveApiKey({
        envKey: "ENV_KEY",
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("ENV_KEY");
  });
  it("falls back to localStorage when env missing AND dialog flag is true", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("LOCAL_KEY");
  });
  it("ignores localStorage when dialog flag is not true", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: false,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBeNull();
  });
  it("returns null when nothing is available", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        enableDialog: true,
        readLocalStorage: () => null,
      })
    ).toBeNull();
  });
  it("treats empty env string as missing", () => {
    expect(
      resolveApiKey({
        envKey: "",
        enableDialog: true,
        readLocalStorage: () => "LOCAL_KEY",
      })
    ).toBe("LOCAL_KEY");
  });
  it("exposes the dev-key localStorage key under a namespace", () => {
    expect(DEV_KEY_STORAGE_KEY).toBe("carpool.devOrsKey");
  });
});
