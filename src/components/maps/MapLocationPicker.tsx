'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from '@react-google-maps/api';
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  Loader2,
  AlertTriangle,
  Crosshair,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';

const LIBRARIES: ('places')[] = ['places'];

// Ubicación inicial por defecto (Santo Domingo, República Dominicana - Sora Cocina Casera)
const DEFAULT_CENTER = {
  lat: 18.4406576,
  lng: -69.9572904,
};

// Sectores populares de Santo Domingo para selección y posicionamiento con 1 toque
const POPULAR_SANTO_DOMINGO_SECTORS = [
  { name: 'Piantini', lat: 18.4749, lng: -69.9355 },
  { name: 'Naco', lat: 18.4676, lng: -69.9275 },
  { name: 'Bella Vista', lat: 18.4568, lng: -69.9405 },
  { name: 'Evaristo Morales', lat: 18.4705, lng: -69.9431 },
  { name: 'Gazcue', lat: 18.4721, lng: -69.8985 },
  { name: 'Los Prados', lat: 18.4795, lng: -69.9532 },
  { name: 'Mirador Sur', lat: 18.4485, lng: -69.9482 },
  { name: 'Arroyo Hondo', lat: 18.4985, lng: -69.9452 },
  { name: 'Zona Colonial', lat: 18.4735, lng: -69.8858 },
  { name: 'Ens. Quisqueya', lat: 18.4682, lng: -69.9498 },
  { name: 'Serrallés', lat: 18.4792, lng: -69.9312 },
  { name: 'El Millón', lat: 18.4625, lng: -69.9555 },
];

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

interface SuggestionItem {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
  latitude?: number;
  longitude?: number;
}

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
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Estados de búsqueda inteligente
  const [searchQuery, setSearchQuery] = useState(address || '');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchStatusNotice, setSearchStatusNotice] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Coordenadas activas (o el centro por defecto si aún no hay coordenadas guardadas)
  const currentCoords = {
    lat: latitude !== null && !isNaN(latitude) ? latitude : DEFAULT_CENTER.lat,
    lng: longitude !== null && !isNaN(longitude) ? longitude : DEFAULT_CENTER.lng,
  };

  const hasCustomCoords = latitude !== null && longitude !== null;

  // Sincronizar texto cuando cambie la dirección desde props
  useEffect(() => {
    if (address && !searchQuery) {
      setSearchQuery(address);
    }
  }, [address]);

  // Manejar clics fuera del dropdown para cerrarlo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.warn('Error buscando lugares:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Seleccionar sugerencia del dropdown
  const handleSelectSuggestion = async (item: SuggestionItem) => {
    setShowDropdown(false);
    setSearchQuery(item.fullText || item.primaryText);
    setSearchStatusNotice(`Ubicando "${item.primaryText}"...`);

    // Si ya trae coordenadas directas (geocoding)
    if (item.latitude && item.longitude) {
      const lat = item.latitude;
      const lng = item.longitude;
      onChangeLocation({
        latitude: lat,
        longitude: lng,
        address: item.fullText || item.primaryText,
      });

      if (map) {
        map.panTo({ lat, lng });
        map.setZoom(16);
      }
      setSearchStatusNotice(`✓ Ubicación fijada: ${item.primaryText}`);
      setTimeout(() => setSearchStatusNotice(null), 3000);
      return;
    }

    // Si requiere obtener detalles por placeId
    try {
      const res = await fetch(`/api/places/search?placeId=${encodeURIComponent(item.placeId)}`);
      if (res.ok) {
        const details = await res.json();
        if (details.latitude && details.longitude) {
          onChangeLocation({
            latitude: details.latitude,
            longitude: details.longitude,
            address: details.address || item.fullText,
          });

          if (map) {
            map.panTo({ lat: details.latitude, lng: details.longitude });
            map.setZoom(16);
          }
          setSearchStatusNotice(`✓ Ubicación fijada: ${details.address || item.primaryText}`);
          setTimeout(() => setSearchStatusNotice(null), 3000);
          return;
        }
      }
    } catch (e) {
      console.warn('Error obteniendo coordenadas de lugar:', e);
    }

    // Fallback Geocoder en el cliente si no hay respuesta de detalles
    if (geocoderRef.current) {
      geocoderRef.current.geocode(
        { address: item.fullText + ', Santo Domingo, República Dominicana' },
        (results, status) => {
          if (status === 'OK' && results && results[0]?.geometry?.location) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            onChangeLocation({
              latitude: lat,
              longitude: lng,
              address: results[0].formatted_address,
            });
            if (map) {
              map.panTo({ lat, lng });
              map.setZoom(16);
            }
            setSearchStatusNotice(`✓ Ubicación fijada en el mapa`);
            setTimeout(() => setSearchStatusNotice(null), 3000);
          }
        }
      );
    }
  };

  // Selección rápida de Sector popular de Santo Domingo
  const handleSelectPopularSector = (sector: { name: string; lat: number; lng: number }) => {
    const fullAddr = `${sector.name}, Santo Domingo, República Dominicana`;
    setSearchQuery(sector.name);
    setShowDropdown(false);

    onChangeLocation({
      latitude: sector.lat,
      longitude: sector.lng,
      address: fullAddr,
    });

    if (map) {
      map.panTo({ lat: sector.lat, lng: sector.lng });
      map.setZoom(16);
    }

    setSearchStatusNotice(`✓ Sector seleccionado: ${sector.name}`);
    setTimeout(() => setSearchStatusNotice(null), 3000);
  };

  // Búsqueda manual al presionar Enter o botón "Buscar"
  const handleManualSearch = () => {
    if (!searchQuery.trim()) return;

    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    setIsLoadingSuggestions(true);
    fetch(`/api/places/search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions && data.suggestions.length > 0) {
          handleSelectSuggestion(data.suggestions[0]);
        } else if (geocoderRef.current) {
          geocoderRef.current.geocode(
            { address: searchQuery.trim() + ', Santo Domingo, República Dominicana' },
            (results, status) => {
              if (status === 'OK' && results && results[0]?.geometry?.location) {
                const lat = results[0].geometry.location.lat();
                const lng = results[0].geometry.location.lng();
                onChangeLocation({
                  latitude: lat,
                  longitude: lng,
                  address: results[0].formatted_address,
                });
                if (map) {
                  map.panTo({ lat, lng });
                  map.setZoom(16);
                }
                setSearchStatusNotice(`✓ Ubicación encontrada: ${results[0].formatted_address}`);
                setTimeout(() => setSearchStatusNotice(null), 3000);
              } else {
                setSearchStatusNotice(`No se encontraron resultados para "${searchQuery}".`);
                setTimeout(() => setSearchStatusNotice(null), 4000);
              }
            }
          );
        }
      })
      .finally(() => setIsLoadingSuggestions(false));
  };

  // Manejar arrastre del marcador o clic en el mapa
  const handleMarkerUpdate = (lat: number, lng: number) => {
    if (geocoderRef.current) {
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const resolvedAddr = results[0].formatted_address;
            setSearchQuery(resolvedAddr);
            onChangeLocation({
              latitude: lat,
              longitude: lng,
              address: resolvedAddr,
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
      setSearchStatusNotice('Obteniendo ubicación GPS de tu dispositivo...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleMarkerUpdate(lat, lng);
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(16);
          }
          setSearchStatusNotice('✓ GPS detectado y centrado en el mapa');
          setTimeout(() => setSearchStatusNotice(null), 3000);
        },
        (error) => {
          console.warn('Error obteniendo geolocalización:', error.message);
          setSearchStatusNotice('No se pudo acceder al GPS del dispositivo');
          setTimeout(() => setSearchStatusNotice(null), 3500);
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
          Cargando Google Maps y Localizador de Direcciones...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Buscador Dinámico de Sectores y Direcciones */}
      <div ref={searchContainerRef} className="space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
            Buscar Sector o Dirección (Santo Domingo)
          </label>
          {searchStatusNotice && (
            <span className="text-[11px] text-primary-sora font-medium animate-in fade-in">
              {searchStatusNotice}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40 z-10">
            {isLoadingSuggestions ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-sora" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            type="text"
            placeholder="Escribe el sector, calle, torre o lugar (ej: Piantini, Bella Vista, Churchill)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!showDropdown && e.target.value.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSearch();
              }
            }}
            className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-sm placeholder:text-text-sora/35 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all shadow-xs"
          />

          <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowDropdown(false);
                }}
                className="p-1 rounded-lg text-text-sora/40 hover:text-text-sora hover:bg-bg-sora"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              title="Centrar en mi ubicación GPS"
              className="p-1.5 rounded-lg text-primary-sora hover:bg-primary-sora/10 transition-colors"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Menú Flotante de Resultados / Sugerencias de Google */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl border border-border-sora shadow-xl max-h-64 overflow-y-auto divide-y divide-border-sora/40 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 bg-bg-sora/60 text-[10px] font-bold text-text-sora/60 flex items-center justify-between">
                <span>Resultados Encontrados ({suggestions.length})</span>
                <span className="text-[9px] text-text-sora/40">Haz clic para posicionar en el mapa</span>
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.placeId || item.fullText}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left p-3 hover:bg-primary-sora/5 transition-colors flex items-start space-x-2.5 group"
                >
                  <MapPin className="w-4 h-4 text-primary-sora flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text-sora group-hover:text-primary-sora transition-colors truncate">
                      {item.primaryText}
                    </p>
                    {item.secondaryText && (
                      <p className="text-[11px] text-text-sora/60 truncate mt-0.5">
                        {item.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sectores Frecuentes de Santo Domingo (Chips de 1 toque) */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-text-sora/60 uppercase tracking-wider">
            <span>Sectores Frecuentes (1 Toque):</span>
            <span className="text-primary-sora flex items-center font-semibold">
              <Sparkles className="w-3 h-3 mr-1" /> Centra el pin al instante
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 py-0.5">
            {POPULAR_SANTO_DOMINGO_SECTORS.map((sec) => {
              const isSelected =
                searchQuery.toLowerCase().includes(sec.name.toLowerCase());
              return (
                <button
                  type="button"
                  key={sec.name}
                  onClick={() => handleSelectPopularSector(sec)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all shadow-2xs flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-primary-sora text-white shadow-xs'
                      : 'bg-white hover:bg-primary-sora/10 text-text-sora/80 border border-border-sora hover:border-primary-sora/40'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5 opacity-60" />
                  <span>{sec.name}</span>
                </button>
              );
            })}
          </div>
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
            title="Arrastra este pin para ajustar la ubicación exacta de entrega"
          />
        </GoogleMap>

        {/* Instrucción visual sobre el mapa */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border-sora/80 text-[10px] text-text-sora/80 flex items-center space-x-1.5 shadow-sm">
          <Navigation className="w-3 h-3 text-primary-sora animate-pulse" />
          <span>Arrastra el pin rojo para marcar la casa o edificio exacto</span>
        </div>
      </div>

      {/* Muestra visual de Coordenadas en tiempo real */}
      <div className="p-3 rounded-xl bg-white/90 border border-border-sora flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-text-sora">GPS Conectado:</span>
            <span className="text-[11px] text-text-sora/60 ml-1">
              {hasCustomCoords
                ? 'Coordenadas listas para calcular ruta y costo de envío'
                : 'Haz clic en un sector, busca o toca el mapa'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-bg-sora text-text-sora border border-border-sora font-medium">
            Lat: <strong className="text-primary-sora">{currentCoords.lat.toFixed(5)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-bg-sora text-text-sora border border-border-sora font-medium">
            Lng: <strong className="text-primary-sora">{currentCoords.lng.toFixed(5)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
