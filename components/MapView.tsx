"use client";

import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { MapPin, Wifi } from "lucide-react";
import { useEffect } from "react";

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
    return (
      <EmptyMap
        icon={<MapPin className="h-7 w-7 text-blue-300" aria-hidden="true" />}
        title="Demo mode"
        body="Add a Google Maps API key to render the real map. The optimizer still works with a deterministic placeholder."
      />
    );
  }
  if (loadError) {
    return (
      <EmptyMap
        icon={<Wifi className="h-7 w-7 text-amber-300" aria-hidden="true" />}
        title="Map failed to load"
        body="Check your key restrictions in Google Cloud Console. Falling back to mock optimizer."
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

function EmptyMap({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-card backdrop-blur">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-white/10">
          {icon}
        </div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{body}</p>
      </div>
    </div>
  );
}
