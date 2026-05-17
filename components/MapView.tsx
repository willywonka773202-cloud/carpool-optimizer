"use client";

import dynamic from "next/dynamic";
import type { Coord } from "@/lib/orsTypes";
import { DemoMapPreview } from "./DemoMapPreview";

const MapViewClient = dynamic(() => import("./MapViewClient"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type Props = {
  apiKey: string | null;
  polyline?: [number, number][];
  stopCoords?: Coord[];
  onLoadError?: () => void;
};

export function MapView({ apiKey, polyline, stopCoords, onLoadError: _onLoadError }: Props) {
  void _onLoadError;
  if (!apiKey) {
    return <DemoMapPreview />;
  }
  return <MapViewClient polyline={polyline} stopCoords={stopCoords} />;
}
