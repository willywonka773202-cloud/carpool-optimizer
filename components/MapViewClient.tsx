"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // continental US
const DEFAULT_ZOOM = 4;

type Props = {
  polyline?: [number, number][];
};

/**
 * Inner client-only component. Renders an OSM-backed Leaflet map with the
 * ORS-derived polyline (when present) and custom S/E markers.
 */
export default function MapViewClient({ polyline }: Props) {
  const markers = useMemo(() => deriveMarkers(polyline ?? []), [polyline]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl
      attributionControl
      className="h-full w-full bg-slate-950"
      style={{ background: "#020617" }}
    >
      <TileLayer url={CARTO_DARK_TILES} attribution={CARTO_ATTRIBUTION} />
      {polyline && polyline.length >= 2 && (
        <>
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.95 }}
          />
          <FitBounds positions={polyline} />
        </>
      )}
      {markers.map((m) => (
        <Marker key={m.key} position={m.position} icon={m.icon} />
      ))}
    </MapContainer>
  );
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, positions]);
  return null;
}

function pinIcon(label: string, fillHex: string): L.DivIcon {
  return L.divIcon({
    className: "carpool-pin",
    html: `
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:14px;
        background:${fillHex};color:white;
        font-weight:700;font-size:12px;
        box-shadow:0 4px 14px rgba(0,0,0,0.45),0 0 0 2px rgba(255,255,255,0.85);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      ">${label}</span>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

type DerivedMarker = {
  key: string;
  position: [number, number];
  icon: L.DivIcon;
};

/**
 * Derive Start / End markers from the polyline. The ORS polyline contains
 * far more points than just the waypoints (it follows roads), so we mark the
 * first point as Start and the last as End. Stop pins (1..N) are not rendered
 * from the polyline alone — they'd need the original geocoded coords. For v2
 * we keep just the S/E pins; the stop list in RouteSummary is the source of
 * truth for the visit order.
 */
function deriveMarkers(positions: [number, number][]): DerivedMarker[] {
  if (positions.length < 2) return [];
  return [
    { key: "start", position: positions[0], icon: pinIcon("S", "#10b981") },
    { key: "end", position: positions[positions.length - 1], icon: pinIcon("E", "#ef4444") },
  ];
}
