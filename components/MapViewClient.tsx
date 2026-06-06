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
import type { RidePlan, RouteOption } from "@/lib/types";
import type { DraftMapMarker } from "./MapView";

const CARTO_DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

type Props = {
  start: string;
  end: string;
  stops: string[];
  riderNames: (string | null)[];
  ridePlan: RidePlan;
  polyline?: [number, number][];
  stopCoords?: Coord[];
  draftMarkers?: DraftMapMarker[];
  routeOptions?: RouteOption[];
  selectedRouteIndex?: number;
  etaSeconds?: number;
  distanceMeters?: number;
  /** While building (no optimized polyline yet), highlights + gently pans to this draft stop. */
  activeStopIndex?: number;
};

export default function MapViewClient({
  polyline,
  stopCoords,
  draftMarkers = [],
  routeOptions = [],
  selectedRouteIndex = 0,
  activeStopIndex,
}: Props) {
  const selectedOption = routeOptions[selectedRouteIndex];
  const activePolyline = selectedOption?.polyline ?? polyline;
  const markers = useMemo(
    () => deriveMarkers(activePolyline ?? [], stopCoords ?? [], draftMarkers, activeStopIndex),
    [activePolyline, stopCoords, draftMarkers, activeStopIndex]
  );
  // Only follow the active stop while building (no optimized route yet); in GO the
  // map stays framed on the whole route via FitBounds.
  const activeStopPosition = useMemo<[number, number] | null>(() => {
    if (activePolyline || activeStopIndex == null) return null;
    const match = draftMarkers.find((m) => m.key === `draft-stop-${activeStopIndex}`);
    return match ? [match.coord.lat, match.coord.lng] : null;
  }, [activePolyline, activeStopIndex, draftMarkers]);
  const fitPositions = useMemo(() => {
    const list: [number, number][] = activePolyline ? [...activePolyline] : [];
    for (const sc of stopCoords ?? []) list.push([sc.lat, sc.lng]);
    for (const marker of draftMarkers) list.push([marker.coord.lat, marker.coord.lng]);
    return list;
  }, [activePolyline, stopCoords, draftMarkers]);

  return (
    <div className="relative h-full w-full">
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
        {routeOptions.map((option, index) =>
          index === selectedRouteIndex || option.polyline.length < 2 ? null : (
            <Polyline
              key={option.id}
              positions={option.polyline}
              pathOptions={{
                color: "#94a3b8",
                weight: 4,
                opacity: 0.42,
                dashArray: "7 9",
              }}
            />
          )
        )}
        {activePolyline && activePolyline.length >= 2 && (
          <>
            <Polyline
              positions={activePolyline}
              pathOptions={{
                color: "#22d3ee",
                weight: 11,
                opacity: 0.2,
                className: "carpool-route-glow",
              }}
            />
            <Polyline
              positions={activePolyline}
              pathOptions={{ color: "#06b6d4", weight: 5, opacity: 0.95 }}
            />
            <Polyline
              positions={activePolyline}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                opacity: 0.9,
                dashArray: "1 16",
                lineCap: "round",
                className: "carpool-route-flow",
              }}
            />
          </>
        )}
        {fitPositions.length >= 2 && <FitBounds positions={fitPositions} />}
        <PanToActiveStop position={activeStopPosition} />
        {markers.map((m) => (
          <Marker key={m.key} position={m.position} icon={m.icon} />
        ))}
      </MapContainer>
    </div>
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

function pinIcon(
  label: string,
  fillHex: string,
  opts: { pulse?: boolean; highlight?: boolean } = {}
): L.DivIcon {
  const { pulse = false, highlight = false } = opts;
  // Geometry is identical for all markers (so anchors stay correct); highlight only
  // adds a glowing colored ring + pulse so the stop being edited stands out.
  const shadow = highlight
    ? `0 0 0 3px rgba(255,255,255,0.96),0 0 16px ${fillHex},0 8px 20px rgba(2,6,23,0.5)`
    : `0 8px 20px rgba(2,6,23,0.42),0 0 0 2px rgba(255,255,255,0.92)`;
  return L.divIcon({
    className: "carpool-pin",
    html: `
      <span style="position:relative;display:inline-flex;width:36px;height:44px;align-items:flex-start;justify-content:center;">
        ${
          pulse || highlight
            ? `<span style="position:absolute;inset:0;border-radius:999px;background:${fillHex};opacity:${highlight ? 0.42 : 0.28};animation:carpool-pulse 1.8s ease-out infinite;"></span>`
            : ""
        }
        <span style="
          position:relative;display:inline-flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:16px;
          background:${fillHex};color:white;
          font-weight:800;font-size:12px;
          box-shadow:${shadow};
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        ">${label}</span>
        <span style="
          position:absolute;top:26px;width:10px;height:10px;
          background:${fillHex};transform:rotate(45deg);
          border-radius:2px;box-shadow:0 8px 18px rgba(2,6,23,0.35);
        "></span>
      </span>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 38],
  });
}

/**
 * Gently re-centers on the active draft stop when the user steps through stops. Stays
 * mounted (position may be null) so its "skip the first pan" ref survives the active stop
 * going in/out of scope — otherwise a remount would reset the ref and swallow real pans.
 */
function PanToActiveStop({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const lat = position?.[0] ?? null;
  const lng = position?.[1] ?? null;
  const isFirstRef = useRef(true);
  useEffect(() => {
    if (lat == null || lng == null) return;
    // Skip the first real pan so we never fight FitBounds' initial framing of the route.
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    map.panTo([lat, lng], { animate: true });
  }, [map, lat, lng]);
  return null;
}

type DerivedMarker = {
  key: string;
  position: [number, number];
  icon: L.DivIcon;
};

function deriveMarkers(
  polyline: [number, number][],
  stopCoords: Coord[],
  draftMarkers: DraftMapMarker[],
  activeStopIndex?: number
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
      icon: pinIcon(String(i + 1), "#0ea5e9"),
    });
  });
  if (out.length === 0) {
    draftMarkers.forEach((marker) => {
      const fill =
        marker.tone === "start"
          ? "#10b981"
          : marker.tone === "end"
          ? "#ef4444"
          : "#f59e0b";
      const highlight =
        activeStopIndex != null && marker.key === `draft-stop-${activeStopIndex}`;
      out.push({
        key: marker.key,
        position: [marker.coord.lat, marker.coord.lng],
        icon: pinIcon(marker.label, fill, { pulse: !highlight, highlight }),
      });
    });
  }
  return out;
}
