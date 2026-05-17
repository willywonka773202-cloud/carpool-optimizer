/** WGS84 latitude/longitude pair. */
export type Coord = { lat: number; lng: number };

/** Render-ready polyline for Leaflet: [lat, lng] in route order. */
export type RoutePolyline = [number, number][];
