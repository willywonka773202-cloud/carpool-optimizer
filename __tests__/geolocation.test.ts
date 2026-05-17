import { describe, expect, it } from "vitest";
import { GeolocationFailure, getCurrentCoord } from "../lib/geolocation";

function fakeGeolocator(behavior: "ok" | "denied" | "timeout" | "unknown" | "missing") {
  if (behavior === "missing") return undefined;
  return {
    getCurrentPosition(
      success: (pos: GeolocationPosition) => void,
      error?: (err: GeolocationPositionError) => void
    ) {
      if (behavior === "ok") {
        success({
          coords: {
            latitude: 42.1,
            longitude: -87.8,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
        return;
      }
      const codeMap: Record<string, number> = { denied: 1, timeout: 3, unknown: 99 };
      error?.({
        code: codeMap[behavior],
        message: behavior,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    },
  };
}

describe("getCurrentCoord", () => {
  it("resolves to {lat, lng} on success", async () => {
    const coord = await getCurrentCoord(fakeGeolocator("ok"));
    expect(coord).toEqual({ lat: 42.1, lng: -87.8 });
  });

  it("rejects with kind 'denied' when permission is denied", async () => {
    await expect(getCurrentCoord(fakeGeolocator("denied"))).rejects.toMatchObject({
      name: "GeolocationFailure",
      kind: "denied",
    });
  });

  it("rejects with kind 'timeout' on timeout", async () => {
    await expect(getCurrentCoord(fakeGeolocator("timeout"))).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it("rejects with kind 'unsupported' when geolocation is missing", async () => {
    // Explicitly pass undefined to opt out of the navigator fallback.
    await expect(
      // @ts-expect-error intentionally passing undefined for this branch
      getCurrentCoord(fakeGeolocator("missing"))
    ).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("rejects with kind 'unknown' on other failures", async () => {
    await expect(getCurrentCoord(fakeGeolocator("unknown"))).rejects.toMatchObject({
      kind: "unknown",
    });
    // sanity: GeolocationFailure class is exported
    expect(GeolocationFailure).toBeDefined();
  });
});
