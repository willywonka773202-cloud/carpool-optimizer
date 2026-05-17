"use client";

import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { useEffect } from "react";
import { DemoMapPreview } from "./DemoMapPreview";

type Props = {
  apiKey: string | null;
  directionsResult?: google.maps.DirectionsResult;
  onLoadError?: () => void;
};

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // continental US
const defaultZoom = 4;

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  // Premium dark-friendly styling for the map surface. Falls back to default if unsupported.
  styles: [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
    {
      featureType: "administrative",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1e293b" }],
    },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#1e293b" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#334155" }],
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#020617" }],
    },
  ],
};

export function MapView({ apiKey, directionsResult, onLoadError }: Props) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
  });

  useEffect(() => {
    if (loadError && onLoadError) onLoadError();
  }, [loadError, onLoadError]);

  if (!apiKey) {
    return <DemoMapPreview />;
  }
  if (loadError) {
    return (
      <DemoMapPreview
        title="Map failed to load"
        body="Check your Google Maps API key restrictions. The optimizer falls back to demo mode below."
      />
    );
  }
  if (!isLoaded) {
    return (
      <div className="relative h-full w-full">
        <div className="skeleton absolute inset-0" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={defaultZoom}
      options={mapOptions}
    >
      {directionsResult && (
        <DirectionsRenderer
          directions={directionsResult}
          options={{
            polylineOptions: {
              strokeColor: "#3b82f6",
              strokeOpacity: 0.95,
              strokeWeight: 5,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}

