"use client";

import { DemoMapPreview } from "./DemoMapPreview";

type Props = {
  apiKey: string | null;
  // Polyline / route geometry plumbing arrives in P3 (react-leaflet rewrite).
  polyline?: [number, number][];
  onLoadError?: () => void;
};

export function MapView({ apiKey: _apiKey, polyline: _polyline, onLoadError: _onLoadError }: Props) {
  void _apiKey;
  void _polyline;
  void _onLoadError;
  return <DemoMapPreview title="Map preview" body="Real OpenStreetMap rendering arrives in the next build step." />;
}
