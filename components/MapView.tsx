"use client";

import dynamic from "next/dynamic";
import type { Coord } from "@/lib/orsTypes";
import type { RidePlan, RouteOption } from "@/lib/types";

export type DraftMapMarker = {
  key: string;
  label: string;
  tone: "start" | "stop" | "end";
  coord: Coord;
};

const MapViewClient = dynamic(() => import("./MapViewClient"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type Props = {
  apiKey: string | null;
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
  activeStopIndex?: number;
  onLoadError?: () => void;
};

export function MapView({
  apiKey,
  start,
  end,
  stops,
  riderNames,
  ridePlan,
  polyline,
  stopCoords,
  draftMarkers,
  routeOptions,
  selectedRouteIndex,
  etaSeconds,
  distanceMeters,
  activeStopIndex,
  onLoadError: _onLoadError,
}: Props) {
  void apiKey;
  void _onLoadError;
  return (
    <MapViewClient
      start={start}
      end={end}
      stops={stops}
      riderNames={riderNames}
      ridePlan={ridePlan}
      polyline={polyline}
      stopCoords={stopCoords}
      draftMarkers={draftMarkers}
      routeOptions={routeOptions}
      selectedRouteIndex={selectedRouteIndex}
      etaSeconds={etaSeconds}
      distanceMeters={distanceMeters}
      activeStopIndex={activeStopIndex}
    />
  );
}
