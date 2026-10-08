'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  Loader2,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';

const LIBRARIES: ('places')[] = ['places'];

// Ubicación inicial por defecto (Santo Domingo, República Dominicana - Sora Cocina Casera)
const DEFAULT_CENTER = {
  lat: 18.4861,
  lng: -69.9312,
};

const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '1rem',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'on' }],
    },
  ],
};

interface MapLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onChangeLocation: (location: {
    latitude: number;
    longitude: number;
    address?: string;
  }) => void;
}

export function MapLocationPicker({
  latitude,
  longitude,
  address,
  onChangeLocation,
}: MapLocationPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Coordenadas activas (o el centro por defecto si aún no hay coordenadas guardadas)
  const currentCoords = {
    lat: latitude !== null && !isNaN(latitude) ? latitude : DEFAULT_CENTER.lat,
    lng: longitude !== null && !isNaN(longitude) ? longitude : DEFAULT_CENTER.lng,
  };

  const hasCustomCoords = latitude !== null && longitude !== null;

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
        geocoderRef.current = new window.google.maps.Geocoder();
      }
      if (hasCustomCoords) {
        mapInstance.panTo(currentCoords);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasCustomCoords, latitude, longitude]
  );

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (
    autocompleteInstance: google.maps.places.Autocomplete
  ) => {
    autocompleteRef.current = autocompleteInstance;
  };

  // Manejar selección de lugar en Google Places Autocomplete
  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address || place.name || address;

      onChangeLocation({
        latitude: lat,
        longitude: lng,
        address: formattedAddress,
      });

      if (map) {
        map.panTo({ lat, lng });
        map.setZoom(16);
      }
    }
  };

  // Manejar arrastre del marcador o clic en el mapa
  const handleMarkerUpdate = (lat: number, lng: number) => {
    // Si tenemos geocoder, intentar obtener el nombre de la dirección correspondiente
    if (geocoderRef.current) {
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onChangeLocation({
              latitude: lat,
              longitude: lng,
              address: results[0].formatted_address,
            });
          } else {
            onChangeLocation({
              latitude: lat,
              longitude: lng,
            });
          }
        }
      );
    } else {
      onChangeLocation({
        latitude: lat,
        longitude: lng,
      });
    }

    if (map) {
      map.panTo({ lat, lng });
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      handleMarkerUpdate(e.latLng.lat(), e.latLng.lng());
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      handleMarkerUpdate(e.latLng.lat(), e.latLng.lng());
    }
  };

  // Centrar en ubicación actual del usuario por GPS
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleMarkerUpdate(lat, lng);
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(16);
          }
        },
        (error) => {
          console.warn('Error obteniendo geolocalización:', error.message);
        }
      );
    }
  };

  if (loadError) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        <div className="flex items-center space-x-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>No se pudo cargar Google Maps</span>
        </div>
        <p className="mt-1 text-[11px] text-amber-700">
          Verifica que la clave NEXT_PUBLIC_GOOGLE_MAPS_API_KEY tenga habilitadas Maps JavaScript API y Places API.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-72 rounded-2xl bg-white/60 border border-border-sora flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 text-primary-sora animate-spin" />
        <span className="text-xs text-text-sora/60 font-medium">
          Cargando Google Maps y Places Autocomplete...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Buscador de Direcciones con Google Places Autocomplete */}
      <div>
        <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
          Buscar Dirección (Google Places)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40 z-10">
            <Search className="w-4 h-4" />
          </div>
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              placeholder="Escribe la calle, número, comuna o lugar..."
              defaultValue={address}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all shadow-sm"
            />
          </Autocomplete>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            title="Usar mi ubicación actual"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-sora hover:text-primary-hover transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mapa interactivo con Marcador Arrastrable */}
      <div className="relative rounded-2xl overflow-hidden border border-border-sora shadow-sm">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentCoords}
          zoom={hasCustomCoords ? 16 : 14}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onClick={handleMapClick}
          options={mapOptions}
        >
          <Marker
            position={currentCoords}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            animation={google.maps.Animation.DROP}
            title="Arrastra este pin para ajustar la ubicación exacta"
          />
        </GoogleMap>

        {/* Instrucción visual sobre el mapa */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border-sora/80 text-[10px] text-text-sora/70 flex items-center space-x-1.5 shadow-sm">
          <Navigation className="w-3 h-3 text-primary-sora animate-pulse" />
          <span>Arrastra el pin o haz clic en el mapa para ajustar</span>
        </div>
      </div>

      {/* Muestra visual de Coordenadas en tiempo real */}
      <div className="p-3 rounded-xl bg-white/80 border border-border-sora/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-6 h-6 rounded-lg bg-primary-sora/10 text-primary-sora flex items-center justify-center flex-shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-text-sora">Coordenadas GPS:</span>
            <span className="text-[11px] text-text-sora/60 ml-1">
              (Sincronizadas en tiempo real)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-bg-sora text-text-sora border border-border-sora font-medium">
            Lat: <strong className="text-primary-sora">{currentCoords.lat.toFixed(6)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-sora text-text-sora border border-border-sora font-medium">
            Lng: <strong className="text-primary-sora">{currentCoords.lng.toFixed(6)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
