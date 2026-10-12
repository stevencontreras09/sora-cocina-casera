'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Order, OrderStatus } from '@/types/database.types';
import {
  SORA_KITCHEN_COORDS,
  optimizeDeliveryRoute,
  RouteStop,
  OptimizedRouteResult,
} from '@/lib/routeOptimizer';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import {
  Navigation,
  Compass,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronRight,
  Crosshair,
  Truck,
  Store,
} from 'lucide-react';

const LIBRARIES: ('places')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '340px',
  borderRadius: '1.25rem',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

interface DeliveryRoutePlannerProps {
  orders: Order[];
  onMarkAsDelivered: (order: Order) => void;
  onStartRoute: (orderId: string) => void;
}

export function DeliveryRoutePlanner({
  orders,
  onMarkAsDelivered,
  onStartRoute,
}: DeliveryRoutePlannerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-route-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  // Modo de origen: 'kitchen' (Cocina Sora) o 'current_gps' (Ubicación actual del motorista)
  const [originMode, setOriginMode] = useState<'kitchen' | 'current_gps'>('kitchen');
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Lista manual de pedidos (para permitir intercambios manuales del repartidor)
  const [customSequence, setCustomSequence] = useState<Order[]>([]);

  // Origen activo
  const activeOrigin = useMemo(() => {
    if (originMode === 'current_gps' && currentGps) {
      return {
        lat: currentGps.lat,
        lng: currentGps.lng,
        name: 'Mi Ubicación Actual (Motorista)',
      };
    }
    return SORA_KITCHEN_COORDS;
  }, [originMode, currentGps]);

  // Inicializar o resetear la ruta cuando cambian los pedidos
  useEffect(() => {
    const route = optimizeDeliveryRoute(orders, activeOrigin);
    const ordered = route.stops.map((s) => s.order);
    setCustomSequence(ordered);
  }, [orders, activeOrigin]);

  // Obtener geolocalización del motorista
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setOriginMode('current_gps');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Error al obtener GPS:', err);
        alert('No se pudo acceder a tu ubicación actual. Usando Cocina Central Sora.');
        setOriginMode('kitchen');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Re-optimizar automáticamente
  const handleAutoOptimize = () => {
    const route = optimizeDeliveryRoute(orders, activeOrigin);
    setCustomSequence(route.stops.map((s) => s.order));
  };

  // Mover orden manualmente hacia arriba o abajo
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const newSeq = [...customSequence];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSeq.length) return;

    const temp = newSeq[index];
    newSeq[index] = newSeq[targetIndex];
    newSeq[targetIndex] = temp;
    setCustomSequence(newSeq);
  };

  // Calcular resultado de la ruta para la secuencia actual
  const routeData: OptimizedRouteResult = useMemo(() => {
    // Si la secuencia actual coincide con pedidos mapeados
    const mapped = customSequence.filter(
      (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number'
    );
    return optimizeDeliveryRoute(mapped, activeOrigin);
  }, [customSequence, activeOrigin]);

  // Coordenadas para el trazado de la polilínea en el mapa
  const polylinePath = useMemo(() => {
    const pts = [{ lat: activeOrigin.lat, lng: activeOrigin.lng }];
    customSequence.forEach((o) => {
      if (typeof o.latitude === 'number' && typeof o.longitude === 'number') {
        pts.push({ lat: o.latitude, lng: o.longitude });
      }
    });
    return pts;
  }, [activeOrigin, customSequence]);

  // Centro del mapa
  const mapCenter = useMemo(() => {
    if (customSequence.length > 0 && customSequence[0].latitude && customSequence[0].longitude) {
      return { lat: customSequence[0].latitude, lng: customSequence[0].longitude };
    }
    return { lat: activeOrigin.lat, lng: activeOrigin.lng };
  }, [customSequence, activeOrigin]);

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center bg-white/90 rounded-3xl border border-border-sora shadow-sm space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-serif font-bold text-lg text-text-sora">
          No hay pedidos pendientes para rutear
        </h3>
        <p className="text-xs text-text-sora/60 max-w-sm mx-auto">
          Cuando cocina despache nuevos pedidos o se te asignen entregas, podrás preparar aquí la ruta más corta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. SELECTOR DE ORIGEN Y MÉTRICAS CLAVE */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-border-sora shadow-sora space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border-sora">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-sora/15 text-primary-sora border border-primary-sora/30 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Planificador Inteligente
              </span>
              <span className="text-[11px] text-text-sora/50 font-medium">
                {customSequence.length} paradas
              </span>
            </div>
            <h2 className="font-serif font-bold text-lg text-text-sora mt-0.5">
              Ruta Óptima de Repartos
            </h2>
          </div>

          {/* Selector de Punto de Salida */}
          <div className="flex items-center space-x-1.5 bg-bg-sora p-1 rounded-2xl border border-border-sora self-start sm:self-auto">
            <button
              onClick={() => setOriginMode('kitchen')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 ${
                originMode === 'kitchen'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'text-text-sora/70 hover:text-text-sora'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Cocina Sora</span>
            </button>

            <button
              onClick={handleGetGpsLocation}
              disabled={isLocating}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 ${
                originMode === 'current_gps'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'text-text-sora/70 hover:text-text-sora'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Ubicando...' : 'Mi GPS'}</span>
            </button>
          </div>
        </div>

        {/* TARJETAS DE MÉTRICAS ESTIMADAS */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="p-3 rounded-2xl bg-bg-sora/70 border border-border-sora">
            <span className="text-[10px] uppercase font-bold text-text-sora/50 tracking-wider block">
              Entregas
            </span>
            <span className="text-lg sm:text-xl font-bold text-text-sora mt-0.5 block">
              {customSequence.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-bg-sora/70 border border-border-sora">
            <span className="text-[10px] uppercase font-bold text-text-sora/50 tracking-wider block">
              Distancia Est.
            </span>
            <span className="text-lg sm:text-xl font-bold text-primary-sora mt-0.5 block">
              ~{routeData.totalDistanceKm} km
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-bg-sora/70 border border-border-sora">
            <span className="text-[10px] uppercase font-bold text-text-sora/50 tracking-wider block">
              Tiempo Total
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5 block">
              ~{routeData.totalEstimatedMinutes} min
            </span>
          </div>
        </div>

        {/* BOTÓN GIGANTE: NAVEGAR TODA LA RUTA EN GOOGLE MAPS */}
        {routeData.googleMapsUrl && (
          <div className="pt-1">
            <a
              href={routeData.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-black text-white text-sm font-bold transition-all shadow-lg shadow-black/20 hover:scale-[1.01] active:scale-[0.98] text-center"
            >
              <Navigation className="w-5 h-5 text-rose-400 animate-pulse" />
              <span>Abrir Toda la Ruta en Google Maps ({customSequence.length} paradas)</span>
              <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
            </a>
            <p className="text-center text-[11px] text-text-sora/50 mt-1.5">
              Carga todas las paradas en secuencia para navegación GPS con tráfico en vivo.
            </p>
          </div>
        )}
      </div>

      {/* 2. MAPA INTERACTIVO CON TRAZADO DE LA RUTA */}
      {isLoaded && (
        <div className="bg-white rounded-3xl p-3 border border-border-sora shadow-sora overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden border border-border-sora/80">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              options={mapOptions}
            >
              {/* Marcador del Origen */}
              <Marker
                position={{ lat: activeOrigin.lat, lng: activeOrigin.lng }}
                title={activeOrigin.name}
                label={{
                  text: originMode === 'kitchen' ? '🏠' : '🛵',
                  fontSize: '18px',
                }}
              />

              {/* Marcadores numerados de cada parada */}
              {customSequence.map((order, idx) => {
                if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
                  return (
                    <Marker
                      key={order.id}
                      position={{ lat: order.latitude, lng: order.longitude }}
                      title={`#${idx + 1} - ${order.client_name}`}
                      label={{
                        text: `${idx + 1}`,
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    />
                  );
                }
                return null;
              })}

              {/* Línea de ruta que une las paradas */}
              {polylinePath.length > 1 && (
                <Polyline
                  path={polylinePath}
                  options={{
                    strokeColor: '#C2665B',
                    strokeOpacity: 0.85,
                    strokeWeight: 4,
                  }}
                />
              )}
            </GoogleMap>

            {/* Pill flotante indicando punto de salida */}
            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl border border-border-sora/80 text-[11px] font-semibold text-text-sora shadow-sm flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-sora animate-ping" />
              <span>Salida: {activeOrigin.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. LISTA SECUENCIAL PASO A PASO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif font-bold text-base text-text-sora">
            Secuencia de Entrega Recomendada
          </h3>
          <button
            onClick={handleAutoOptimize}
            className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-primary-sora/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-optimizar Ruta</span>
          </button>
        </div>

        {customSequence.map((order, idx) => {
          const stopNumber = idx + 1;
          const cleanPhone = cleanPhoneNumber(order.client_phone);
          const clientFirstName = order.client_name.split(' ')[0];
          const isPaid = order.payment_status === 'pagado';
          const isEnCamino = (order.status || '').toLowerCase() === 'en camino';

          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `Hola ${clientFirstName}, voy en camino con tu pedido #${order.order_number} de Sora Cocina Casera.`
          )}`;
          const callUrl = `tel:${cleanPhone}`;

          const singleGoogleMapsUrl =
            order.latitude && order.longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;

          const singleWazeUrl =
            order.latitude && order.longitude
              ? `https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes`
              : `https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes`;

          const matchingStop = routeData.stops.find((s) => s.order.id === order.id);

          return (
            <div
              key={order.id}
              className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-sora space-y-3.5 transition-all ${
                isEnCamino
                  ? 'border-primary-sora ring-2 ring-primary-sora/20'
                  : 'border-border-sora'
              }`}
            >
              {/* Encabezado de la parada */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary-sora text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                    {stopNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-text-sora">
                        #{order.order_number}
                      </span>
                      {matchingStop && (
                        <span className="text-[10px] font-bold text-primary-sora bg-primary-sora/10 px-2 py-0.5 rounded-full">
                          +{matchingStop.distanceFromPreviousKm} km (~{matchingStop.estimatedMinutesFromPrevious} min)
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-base text-text-sora truncate mt-0.5">
                      {order.client_name}
                    </h4>
                  </div>
                </div>

                {/* Controles para reordenar manualmente parada */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveStop(idx, 'up')}
                    className="p-1.5 rounded-lg border border-border-sora text-text-sora/60 hover:text-text-sora hover:bg-bg-sora disabled:opacity-30 disabled:pointer-events-none"
                    title="Mover entrega arriba"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === customSequence.length - 1}
                    onClick={() => handleMoveStop(idx, 'down')}
                    className="p-1.5 rounded-lg border border-border-sora text-text-sora/60 hover:text-text-sora hover:bg-bg-sora disabled:opacity-30 disabled:pointer-events-none"
                    title="Mover entrega abajo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Indicador de Pago */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-xs text-text-sora/80">
                  <MapPin className="w-3.5 h-3.5 text-primary-sora flex-shrink-0" />
                  <span className="truncate max-w-[220px] sm:max-w-xs">{order.address}</span>
                </div>

                {isPaid ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                    ✓ PAGADO
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-red-50 text-red-700 font-bold text-[11px] border border-red-200">
                    ⚠ COBRAR: {formatCurrency(parseFloat(order.total as any) || 0)}
                  </span>
                )}
              </div>

              {/* Horario de entrega programado si existe */}
              {order.delivery_time && (
                <div className="flex items-center space-x-1.5 text-xs text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200/80">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Entrega programada para:{' '}
                    <strong className="font-bold">{order.delivery_time}</strong>
                  </span>
                </div>
              )}

              {/* Referencia si existe */}
              {order.address_reference && (
                <p className="text-[11px] text-text-sora/70 bg-bg-sora/70 p-2.5 rounded-xl border border-border-sora/80 italic">
                  Ref: "{order.address_reference}"
                </p>
              )}

              {/* Acciones de navegación y comunicación */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <a
                  href={singleGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold text-center flex items-center justify-center space-x-1 hover:bg-black transition-all"
                  title="Navegar con Google Maps"
                >
                  <Navigation className="w-3 h-3 text-rose-400" />
                  <span>Maps</span>
                </a>

                <a
                  href={singleWazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-[#33CCFF] text-slate-900 text-[11px] font-bold text-center flex items-center justify-center space-x-1 hover:bg-[#20b8eb] transition-all"
                  title="Navegar con Waze"
                >
                  <Compass className="w-3 h-3 text-slate-900" />
                  <span>Waze</span>
                </a>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-whatsapp text-white text-[11px] font-bold text-center flex items-center justify-center space-x-1 hover:bg-[#20bd5a] transition-all"
                  title="WhatsApp al cliente"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={callUrl}
                  className="py-2.5 px-2 rounded-xl bg-white border border-border-sora text-text-sora text-[11px] font-bold text-center flex items-center justify-center space-x-1 hover:bg-bg-sora transition-all"
                  title="Llamar al cliente"
                >
                  <Phone className="w-3 h-3 text-primary-sora" />
                  <span>Llamar</span>
                </a>
              </div>

              {/* Botón de acción de estado */}
              <div className="pt-2 border-t border-border-sora flex items-center gap-2">
                {!isEnCamino && (
                  <button
                    onClick={() => onStartRoute(order.id)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Iniciar este Pedido</span>
                  </button>
                )}

                <button
                  onClick={() => onMarkAsDelivered(order)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar como Entregado</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
