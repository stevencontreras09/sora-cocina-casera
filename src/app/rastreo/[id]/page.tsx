'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types/database.types';
import { isValidUuid } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { playKitchenChime, triggerVibration } from '@/lib/audioAlerts';
import { SORA_CONFIG } from '@/lib/constants';
import {
  SORA_KITCHEN_COORDS,
  calculateHaversineDistanceKm,
} from '@/lib/routeOptimizer';
import {
  ChefHat,
  Flame,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  RefreshCw,
  Copy,
  Check,
  Store,
  Navigation,
  Compass,
  ExternalLink,
} from 'lucide-react';

const GOOGLE_LIBRARIES: ('places')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '260px',
  borderRadius: '1rem',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

export default function PublicOrderTrackingPage() {
  const params = useParams();
  const rawId = (params?.id as string) || '';
  const supabase = useMemo(() => createClient(), []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-tracking-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_LIBRARIES,
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Coordenadas en tiempo real del repartidor
  const [driverCoords, setDriverCoords] = useState<{
    lat: number;
    lng: number;
    driverName?: string;
    speed?: number | null;
    timestamp?: number;
  } | null>(null);

  // 1. Cargar pedido público desde Supabase por ID o por número de orden
  const loadOrder = async () => {
    if (!rawId) return;
    setIsLoading(true);
    setNotFound(false);

    try {
      const decodedId = decodeURIComponent(rawId).trim();
      let foundOrder: Order | null = null;

      // Intento A: Si es un UUID válido, buscar por ID primario
      if (isValidUuid(decodedId)) {
        const { data: byId } = await supabase
          .from('orders')
          .select('*')
          .eq('id', decodedId)
          .maybeSingle();

        if (byId) {
          foundOrder = byId as Order;
        }
      }

      // Intento B: Buscar por número de orden exacto (ej: SORA-6129)
      if (!foundOrder) {
        try {
          const { data: byOrderNum } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', decodedId)
            .limit(1);

          if (byOrderNum && byOrderNum.length > 0) {
            foundOrder = byOrderNum[0] as Order;
          }
        } catch (_) {}
      }

      // Intento C: Buscar por coincidencia numérica
      if (!foundOrder) {
        try {
          const numericPart = decodedId.replace(/[^0-9]/g, '');
          if (numericPart) {
            const { data: byIlike } = await supabase
              .from('orders')
              .select('*')
              .ilike('order_number', `%${numericPart}%`)
              .order('created_at', { ascending: false })
              .limit(1);

            if (byIlike && byIlike.length > 0) {
              foundOrder = byIlike[0] as Order;
            }
          }
        } catch (_) {}
      }

      // Intento D: Respaldo local de contingencia
      if (!foundOrder) {
        try {
          const localOrders =
            typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('sora_orders') || '[]')
              : [];
          const matched = localOrders.find(
            (o: any) =>
              o.id === decodedId ||
              (o.order_number && o.order_number.toLowerCase() === decodedId.toLowerCase()) ||
              (o.order_number && decodedId.includes(o.order_number))
          );
          if (matched) {
            foundOrder = matched as Order;
          }
        } catch (_) {}
      }

      if (foundOrder) {
        // Normalizar metadatos si vienen dentro de items._metadata
        let finalOrder = { ...foundOrder };
        if (!finalOrder.order_number && Array.isArray(finalOrder.items) && (finalOrder.items[0] as any)?._metadata) {
          const meta = (finalOrder.items[0] as any)._metadata;
          finalOrder.order_number = meta.order_number || finalOrder.order_number;
          finalOrder.client_name = meta.client_name || finalOrder.client_name;
          finalOrder.client_phone = meta.client_phone || finalOrder.client_phone;
          finalOrder.address = meta.address || finalOrder.address;
        }

        setOrder(finalOrder);
        setNotFound(false);
        setLastUpdated(new Date());
      } else {
        setNotFound(true);
        setOrder(null);
      }
    } catch (err) {
      console.warn('Error al buscar orden pública:', err);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawId, supabase]);

  // 2. Suscripción en Tiempo Real con Supabase WebSockets para esta orden específica
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`public:tracking:${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const updated = payload.new as Order;
            const previousStatus = order.status;
            setOrder(updated);
            setLastUpdated(new Date());

            if (previousStatus !== updated.status) {
              playKitchenChime();
              triggerVibration([200, 100, 250]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, supabase, order?.status]);

  // 3. Suscripción al Canal GPS en Tiempo Real del Repartidor
  useEffect(() => {
    if (!order) return;

    // Intentar leer último GPS si está en almacenamiento local
    try {
      const cached = localStorage.getItem('sora_driver_live_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - (parsed.timestamp || 0) < 1000 * 60 * 45) {
          setDriverCoords(parsed);
        }
      }
    } catch (_) {}

    const trackingChannel = supabase
      .channel('sora-live-tracking')
      .on('broadcast', { event: 'driver-location' }, (payload: any) => {
        if (payload?.payload) {
          setDriverCoords(payload.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
    };
  }, [order, supabase]);

  // Normalizar estado
  const currentStep = useMemo(() => {
    if (!order) return 1;
    const st = (order.status || '').toLowerCase().trim();
    if (st === 'cancelado') return -1;
    if (st === 'entregado') return 4;
    if (st === 'en camino') return 3;
    if (st === 'en preparacion' || st === 'en horno') return 2;
    return 1; // 'pendiente'
  }, [order]);

  // Identificar si la orden es para retirar en el local
  const isPickup = useMemo(() => {
    if (!order) return false;
    return (
      order.delivery_type === 'pickup' ||
      order.delivery_user_name === 'Retiro en Local' ||
      (Boolean(order.address) && order.address.toLowerCase().includes('retiro en local'))
    );
  }, [order]);

  // Coordenadas del cliente destino
  const clientLocation = useMemo(() => {
    if (order?.latitude && order?.longitude) {
      return { lat: order.latitude, lng: order.longitude };
    }
    return null;
  }, [order]);

  // Distancia y tiempo restante estimado hacia el cliente
  const liveTrackingMetrics = useMemo(() => {
    const origin = driverCoords ? { lat: driverCoords.lat, lng: driverCoords.lng } : SORA_KITCHEN_COORDS;
    const destination = clientLocation || { lat: 18.4500, lng: -69.9500 };

    const distanceKm = calculateHaversineDistanceKm(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );

    // Estimación en moto en Santo Domingo (~22 km/h con semáforos)
    const minutesLeft = Math.max(2, Math.round((distanceKm / 22) * 60));

    return {
      distanceKm: Math.max(0.1, Math.round(distanceKm * 10) / 10),
      minutesLeft,
      isLiveGps: Boolean(driverCoords),
    };
  }, [driverCoords, clientLocation]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Rastreo Pedido #${order?.order_number || ''} • Sora Cocina Casera`,
          text: `Sigue el estado de tu pedido de Sora Cocina Casera en tiempo real:`,
          url: window.location.href,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  const whatsappHelpUrl = useMemo(() => {
    const text = encodeURIComponent(
      `¡Hola Sora Cocina Casera! Tengo una consulta sobre mi pedido #${order?.order_number || rawId}.`
    );
    return `https://wa.me/${SORA_CONFIG.whatsappNumber}?text=${text}`;
  }, [order, rawId]);

  return (
    <div className="min-h-screen bg-bg-sora text-text-sora flex flex-col justify-between selection:bg-primary-sora/20">
      {/* 1. CABECERA CON MARCA DE SORA */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border-sora sticky top-0 z-30 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-md shadow-primary-sora/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-none text-text-sora">
                Sora
              </h1>
              <p className="text-[10px] text-text-sora/60 uppercase tracking-widest font-semibold mt-0.5">
                Cocina Casera • Rastreo en Vivo
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={loadOrder}
              disabled={isLoading}
              title="Actualizar estado"
              className="p-2 rounded-xl border border-border-sora hover:bg-bg-sora text-text-sora/70 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              title="Compartir enlace de rastreo"
              className="p-2 rounded-xl border border-border-sora hover:bg-bg-sora text-text-sora/70 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4 text-primary-sora" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {isLoading && !order ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-sora/15 text-primary-sora flex items-center justify-center mx-auto animate-bounce">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-text-sora">
              Buscando tu pedido...
            </h3>
            <p className="text-xs text-text-sora/60">
              Conectando con la cocina en tiempo real
            </p>
          </div>
        ) : notFound ? (
          <div className="py-16 text-center space-y-4 bg-white rounded-3xl p-6 border border-border-sora shadow-sm animate-in fade-in">
            <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-text-sora">
                Pedido no encontrado
              </h3>
              <p className="text-xs text-text-sora/70 mt-1.5 max-w-sm mx-auto leading-relaxed">
                No pudimos localizar la orden con identificador{' '}
                <strong className="font-mono text-primary-sora">{rawId}</strong>. Verifica el enlace enviado por WhatsApp o comunícate con nosotros.
              </p>
            </div>
            <a
              href={whatsappHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contactar a Sora por WhatsApp ({SORA_CONFIG.phoneDisplay})</span>
            </a>
          </div>
        ) : order ? (
          <>
            {/* TARJETA DE ESTADO EN VIVO CON TIMELINE */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sm space-y-5">
              {/* Header de la orden */}
              <div className="flex items-start justify-between pb-4 border-b border-border-sora">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-sora bg-primary-sora/10 px-2.5 py-0.5 rounded-full border border-primary-sora/20">
                      Orden #{order.order_number}
                    </span>
                    {isPickup && (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center">
                        <Store className="w-3 h-3 mr-1" />
                        Retiro en Local
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif font-bold text-xl text-text-sora mt-1.5">
                    ¡Hola, {order.client_name?.split(' ')[0]}!
                  </h2>
                  <p className="text-xs text-text-sora/60 mt-0.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-text-sora/40" />
                    <span>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    {order.is_scheduled && order.delivery_time && (
                      <span className="ml-2 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {isPickup ? 'Retiro a las:' : 'Entrega programada:'} {order.delivery_time}
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-text-sora/50 block">Total</span>
                  <span className="font-serif font-bold text-lg text-primary-sora">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              {/* TIMELINE DE 4 PASOS */}
              {currentStep === -1 ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-1">
                  <span className="font-bold text-sm">Este pedido fue cancelado</span>
                  <p className="text-xs text-rose-700">
                    Si tienes dudas, contáctanos directamente a nuestra cocina vía WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-text-sora/70 px-1">
                    <span>Estado del Pedido</span>
                    <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                      En vivo vía WebSockets
                    </span>
                  </div>

                  <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-sora">
                    {/* Paso 1: Recibido */}
                    <div className="relative">
                      <div
                        className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          currentStep >= 1
                            ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        ✓
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-text-sora">
                          1. Pedido Confirmado
                        </h4>
                        <p className="text-[11px] text-text-sora/60 mt-0.5">
                          Recibimos tu orden en cocina y verificamos disponibilidad de ingredientes.
                        </p>
                      </div>
                    </div>

                    {/* Paso 2: En Horno */}
                    <div className="relative">
                      <div
                        className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          currentStep > 2
                            ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
                            : currentStep === 2
                            ? 'bg-primary-sora text-white shadow-sm ring-4 ring-primary-sora/20 animate-pulse'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {currentStep > 2 ? '✓' : <Flame className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <h4 className={`font-bold text-xs sm:text-sm ${currentStep === 2 ? 'text-primary-sora' : 'text-text-sora'}`}>
                          2. En el Horno Casero
                        </h4>
                        <p className="text-[11px] text-text-sora/60 mt-0.5">
                          Tu lasaña se hornea artesanalmente para entregarse caliente y en su punto óptimo.
                        </p>
                      </div>
                    </div>

                    {/* Paso 3: En Camino vs Listo para Retirar */}
                    <div className="relative">
                      <div
                        className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          currentStep > 3
                            ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
                            : currentStep === 3
                            ? isPickup
                              ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100 animate-pulse'
                              : 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 animate-pulse'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {currentStep > 3 ? (
                          '✓'
                        ) : isPickup ? (
                          <Store className="w-3.5 h-3.5" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h4
                          className={`font-bold text-xs sm:text-sm ${
                            currentStep === 3
                              ? isPickup
                                ? 'text-emerald-700'
                                : 'text-blue-700'
                              : 'text-text-sora'
                          }`}
                        >
                          {isPickup ? '3. ¡Listo para Retiro en Cocina!' : '3. En Camino con Repartidor'}
                        </h4>
                        <p className="text-[11px] text-text-sora/60 mt-0.5">
                          {isPickup
                            ? 'Tu pedido ya está empacado y calentito esperando que pases por él a Cocina Sora.'
                            : order.delivery_user_name
                            ? `Tu repartidor ${order.delivery_user_name} va en ruta hacia tu dirección.`
                            : 'El motorista va en camino con tu comida empacada térmicamente.'}
                        </p>
                      </div>
                    </div>

                    {/* Paso 4: Entregado */}
                    <div className="relative">
                      <div
                        className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          currentStep >= 4
                            ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {currentStep >= 4 ? '✓' : '4'}
                      </div>
                      <div>
                        <h4 className={`font-bold text-xs sm:text-sm ${currentStep >= 4 ? 'text-emerald-700' : 'text-text-sora/60'}`}>
                          4. ¡Entregado con Éxito!
                        </h4>
                        <p className="text-[11px] text-text-sora/60 mt-0.5">
                          ¡Buen provecho! Esperamos que disfrutes cada bocado de Sora Cocina Casera.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEGUIMIENTO EN VIVO DEL REPARTIDOR (SOLO SI ES DELIVERY Y ESTÁ EN CAMINO) */}
            {!isPickup && currentStep === 3 && (
              <div className="bg-gradient-to-br from-blue-500/10 via-white to-primary-sora/10 rounded-3xl p-5 sm:p-6 border border-blue-200 shadow-md space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                      <Navigation className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping mr-1.5" />
                        Repartidor en Ruta
                      </span>
                      <h3 className="font-serif font-bold text-base text-text-sora mt-0.5">
                        {order.delivery_user_name || driverCoords?.driverName || 'Motorista Sora'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-text-sora/50 font-semibold block uppercase">
                      Llegada estimada
                    </span>
                    <span className="font-serif font-bold text-lg text-blue-700">
                      ~{liveTrackingMetrics.minutesLeft} min
                    </span>
                  </div>
                </div>

                {/* Barra de progreso de acercamiento */}
                <div className="p-3.5 rounded-2xl bg-white/90 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-text-sora/70 flex items-center">
                      <Compass className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Distancia restante:
                    </span>
                    <span className="text-blue-800 font-bold font-mono">
                      ~{liveTrackingMetrics.distanceKm} km
                    </span>
                  </div>

                  {/* Barra animada de trayectoria */}
                  <div className="relative pt-2 pb-1">
                    <div className="w-full h-2 rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-primary-sora transition-all duration-1000 animate-pulse"
                        style={{
                          width: `${Math.min(95, Math.max(15, 100 - liveTrackingMetrics.distanceKm * 10))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-sora/50 font-semibold mt-1.5">
                      <span>🍳 Cocina Sora</span>
                      <span className="text-blue-600 font-bold">🛵 En camino</span>
                      <span>🏠 Tu Dirección</span>
                    </div>
                  </div>
                </div>

                {/* MAPA INTERACTIVO DE GOOGLE MAPS */}
                {isMapLoaded && apiKey ? (
                  <div className="rounded-2xl overflow-hidden border border-border-sora shadow-xs">
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={
                        driverCoords
                          ? { lat: driverCoords.lat, lng: driverCoords.lng }
                          : clientLocation || SORA_KITCHEN_COORDS
                      }
                      zoom={14}
                      options={mapOptions}
                    >
                      {/* Marcador del Repartidor */}
                      {driverCoords && (
                        <Marker
                          position={{ lat: driverCoords.lat, lng: driverCoords.lng }}
                          title={`Repartidor: ${order.delivery_user_name || 'Sora'}`}
                          label={{
                            text: '🛵',
                            fontSize: '20px',
                          }}
                        />
                      )}

                      {/* Marcador de la Casa del Cliente */}
                      {clientLocation && (
                        <Marker
                          position={clientLocation}
                          title={`Destino: ${order.client_name}`}
                          label={{
                            text: '🏠',
                            fontSize: '20px',
                          }}
                        />
                      )}

                      {/* Marcador de Cocina Sora */}
                      <Marker
                        position={SORA_KITCHEN_COORDS}
                        title="Cocina Sora"
                        label={{
                          text: '🍳',
                          fontSize: '18px',
                        }}
                      />

                      {/* Línea conectora entre puntos */}
                      {clientLocation && (
                        <Polyline
                          path={[
                            driverCoords
                              ? { lat: driverCoords.lat, lng: driverCoords.lng }
                              : SORA_KITCHEN_COORDS,
                            clientLocation,
                          ]}
                          options={{
                            strokeColor: '#3B82F6',
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                          }}
                        />
                      )}
                    </GoogleMap>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white border border-border-sora text-center text-xs text-text-sora/70 flex items-center justify-center space-x-2">
                    <Truck className="w-4 h-4 text-blue-600 animate-bounce" />
                    <span>El repartidor va en camino a tu sector. ¡Mantén tu teléfono atento!</span>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN ESPECIAL PARA RETIRO EN LOCAL */}
            {isPickup && (
              <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-emerald-950">
                      Ubicación para Retirar tu Pedido
                    </h3>
                    <p className="text-[11px] text-emerald-800">
                      Sora Cocina Casera • Santo Domingo
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-emerald-200/60 text-xs text-text-sora space-y-1">
                  <p className="font-semibold text-text-sora">
                    {SORA_KITCHEN_COORDS.address}
                  </p>
                  <p className="text-[11px] text-text-sora/60">
                    Puedes pasar directamente al mostrador de entrega e indicar el <strong>#{order.order_number}</strong>.
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${SORA_KITCHEN_COORDS.lat},${SORA_KITCHEN_COORDS.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  <span>¿Cómo llegar? Abrir ruta en Google Maps</span>
                </a>
              </div>
            )}

            {/* DETALLES DE LOS PLATOS ORDENADOS */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sm space-y-4">
              <div className="flex items-center space-x-2 font-serif font-bold text-text-sora text-base pb-2 border-b border-border-sora">
                <ShoppingBag className="w-4 h-4 text-primary-sora" />
                <span>Platos Ordenados</span>
              </div>

              <div className="divide-y divide-border-sora/60">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-text-sora">
                          {it.quantity}x {it.name}
                        </span>
                        <span className="text-[11px] text-text-sora/50 block">
                          {formatCurrency(it.price)} c/u
                        </span>
                      </div>
                      <span className="font-semibold text-text-sora">
                        {formatCurrency(it.subtotal || it.price * it.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-sora/60 py-2">
                    Lasaña Casera Horneada
                  </p>
                )}
              </div>

              {/* Resumen financiero */}
              <div className="pt-2 border-t border-border-sora space-y-1.5 text-xs">
                {!isPickup && order.delivery_fee !== undefined && order.delivery_fee > 0 && (
                  <div className="flex justify-between text-text-sora/70">
                    <span>Costo de Envío (Delivery)</span>
                    <span className="font-semibold">{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                {isPickup && (
                  <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                    <span>Modalidad de Entrega</span>
                    <span>Retiro en Local (Gratis - RD$ 0)</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-text-sora pt-1 border-t border-dashed border-border-sora">
                  <span>Total</span>
                  <span className="text-primary-sora font-serif text-base font-bold">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-text-sora/60 pt-0.5">
                  <span>Método de pago:</span>
                  <span className="font-semibold capitalize text-text-sora">
                    {order.payment_method === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-text-sora/60">
                  <span>Estado del pago:</span>
                  <span
                    className={`font-bold ${
                      order.payment_status === 'pagado' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {order.payment_status === 'pagado' ? '● Pagado' : isPickup ? '● Pagar al retirar' : '● Cobrar al entregar'}
                  </span>
                </div>
              </div>
            </div>

            {/* DIRECCIÓN DE ENTREGA O RETIRO */}
            <div className="bg-white rounded-3xl p-5 border border-border-sora shadow-sm space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-text-sora/80 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-primary-sora" />
                <span>{isPickup ? 'Lugar de Retiro' : 'Destino de Entrega'}</span>
              </div>
              <p className="text-xs font-semibold text-text-sora">
                {isPickup ? 'Sora Cocina Casera (Santo Domingo)' : (order.address || 'Dirección registrada')}
              </p>
              {order.address_reference && !isPickup && (
                <p className="text-[11px] text-text-sora/60 bg-bg-sora p-2 rounded-xl border border-border-sora">
                  <strong>Referencia:</strong> {order.address_reference}
                </p>
              )}
            </div>

            {/* BOTÓN DE CONTACTO DIRECTO POR WHATSAPP */}
            <div className="space-y-2.5 pt-2">
              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>¿Dudas con tu pedido? Escríbenos al {SORA_CONFIG.phoneDisplay}</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-2xl border border-border-sora bg-white hover:bg-bg-sora text-text-sora text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs transition-all"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>¡Enlace copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-text-sora/50" />
                    <span>Copiar Enlace de Rastreo</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
      </main>

      {/* 3. PIE DE PÁGINA */}
      <footer className="py-6 px-4 text-center border-t border-border-sora/60 bg-white/40 mt-8">
        <p className="text-xs font-bold text-text-sora font-serif">
          Sora Cocina Casera
        </p>
        <p className="text-[10px] text-text-sora/50 mt-0.5">
          {SORA_CONFIG.city} • WhatsApp: {SORA_CONFIG.phoneDisplay} • v1.2.3
        </p>
      </footer>
    </div>
  );
}
