"use client";

import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { useEffect } from "react";

type Props = {
  apiKey: string | null;
  directionsResult?: google.maps.DirectionsResult;
  onLoadError?: () => void;
};

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // continental US center
const defaultZoom = 4;

export function MapView({ apiKey, directionsResult, onLoadError }: Props) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
  });

  useEffect(() => {
    if (loadError && onLoadError) onLoadError();
  }, [loadError, onLoadError]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-600">
        Map preview unavailable — running in mock mode (no API key).
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-600">
        Map failed to load. Falling back to mock optimizer.
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="h-full w-full animate-pulse bg-slate-100" />;
  }

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={defaultZoom}>
      {directionsResult && <DirectionsRenderer directions={directionsResult} />}
    </GoogleMap>
  );
}
