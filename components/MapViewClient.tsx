"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import type { Coord } from "@/lib/orsTypes";

const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

type Props = {
  polyline?: [number, number][];
  stopCoords?: Coord[];
};

export default function MapViewClient({ polyline, stopCoords }: Props) {
  const markers = useMemo(
    () => deriveMarkers(polyline ?? [], stopCoords ?? []),
    [polyline, stopCoords]
  );
  const fitPositions = useMemo(() => {
    const list: [number, number][] = polyline ? [...polyline] : [];
    for (const sc of stopCoords ?? []) list.push([sc.lat, sc.lng]);
    return list;
  }, [polyline, stopCoords]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      attributionControl
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#020617" }}
    >
      <TileLayer url={CARTO_DARK_TILES} attribution={CARTO_ATTRIBUTION} />
      <ZoomControl position="topright" />
      <InvalidateOnResize />
      {polyline && polyline.length >= 2 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.95 }}
        />
      )}
      {fitPositions.length >= 2 && <FitBounds positions={fitPositions} />}
      {markers.map((m) => (
        <Marker key={m.key} position={m.position} icon={m.icon} />
      ))}
    </MapContainer>
  );
}

function InvalidateOnResize() {
  const map = useMap();
  const observerRef = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const container = map.getContainer();
    if ("ResizeObserver" in window) {
      observerRef.current = new ResizeObserver(() => map.invalidateSize());
      observerRef.current.observe(container);
    }
    return () => {
      cancelAnimationFrame(raf);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [map]);
  return null;
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

function deriveMarkers(
  polyline: [number, number][],
  stopCoords: Coord[]
): DerivedMarker[] {
  const out: DerivedMarker[] = [];
  if (polyline.length >= 2) {
    out.push({ key: "start", position: polyline[0], icon: pinIcon("S", "#10b981") });
    out.push({
      key: "end",
      position: polyline[polyline.length - 1],
      icon: pinIcon("E", "#ef4444"),
    });
  }
  stopCoords.forEach((c, i) => {
    out.push({
      key: `stop-${i}`,
      position: [c.lat, c.lng],
      icon: pinIcon(String(i + 1), "#3b82f6"),
    });
  });
  return out;
}
