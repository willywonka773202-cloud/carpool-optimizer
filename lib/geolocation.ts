import type { Coord } from "./orsTypes";

export type GeolocationErrorKind = "denied" | "unsupported" | "timeout" | "unknown";

export class GeolocationFailure extends Error {
  readonly kind: GeolocationErrorKind;
  constructor(kind: GeolocationErrorKind, message: string) {
    super(message);
    this.name = "GeolocationFailure";
    this.kind = kind;
  }
}

export type Geolocator = Pick<Geolocation, "getCurrentPosition">;

/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition with error
 * normalization. The optional `geolocator` argument is for testing — tests can
 * pass a fake with the same shape.
 */
export function getCurrentCoord(
  geolocator?: Geolocator,
  options: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
): Promise<Coord> {
  const source =
    geolocator ??
    (typeof navigator !== "undefined" ? navigator.geolocation : undefined);

  if (!source) {
    return Promise.reject(
      new GeolocationFailure("unsupported", "This browser does not support location access.")
    );
  }

  return new Promise<Coord>((resolve, reject) => {
    source.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            reject(
              new GeolocationFailure(
                "denied",
                "Location permission was denied. You can still type your start address."
              )
            );
            break;
          case 3: // TIMEOUT
            reject(
              new GeolocationFailure(
                "timeout",
                "Could not get your location. Try again or type your start address."
              )
            );
            break;
          default:
            reject(
              new GeolocationFailure(
                "unknown",
                "Couldn't read your location. Try again or type your start address."
              )
            );
        }
      },
      options
    );
  });
}
