"use client";

import dynamic from "next/dynamic";
import { DemoMapPreview } from "./DemoMapPreview";

const MapViewClient = dynamic(() => import("./MapViewClient"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type Props = {
  apiKey: string | null;
  polyline?: [number, number][];
  onLoadError?: () => void;
};

/**
 * SSR-safe map shell. Renders the designed demo preview when there's no ORS
 * key (real geocoding wouldn't work anyway, so a bare map would be misleading).
 * Otherwise renders the client-only Leaflet/OSM map.
 */
export function MapView({ apiKey, polyline, onLoadError: _onLoadError }: Props) {
  void _onLoadError; // reserved for future tile-load-error handling
  if (!apiKey) {
    return <DemoMapPreview />;
  }
  return <MapViewClient polyline={polyline} />;
}
