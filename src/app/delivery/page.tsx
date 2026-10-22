'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types/database.types';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import { getStoredOrders, saveStoredOrders, isValidUuid, calculateOrderUrgency } from '@/lib/storage';
import { triggerKitchenAlert } from '@/lib/audioAlerts';
import {
  Truck,
  Phone,
  MapPin,
  MessageCircle,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Package,
  Layers,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { DeliveryRoutePlanner } from '@/components/delivery/DeliveryRoutePlanner';

export default function DeliveryMobilePage() {
  const { user, profile, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Lista limpia inicial con carga desde almacenamiento local si existe
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'activos' | 'ruta' | 'historial'>('activos');

  // Modal de confirmación para "Marcar como Entregado"
  const [orderToDeliver, setOrderToDeliver] = useState<Order | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Transmisión de ubicación GPS en tiempo real para los clientes
  const [isTransmittingGps, setIsTransmittingGps] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const startGpsTransmission = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsTransmittingGps(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);

        // Emitir coordenadas vía WebSockets Broadcast a los clientes que están rastreando
        try {
          const liveChannel = supabase.channel('sora-live-tracking');
          liveChannel.send({
            type: 'broadcast',
            event: 'driver-location',
            payload: {
              driverId: user?.id,
              driverName: profile?.full_name || 'Repartidor Sora',
              lat: coords.lat,
              lng: coords.lng,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: Date.now(),
            },
          });

          localStorage.setItem(
            'sora_driver_live_coords',
            JSON.stringify({
              ...coords,
              timestamp: Date.now(),
              driverName: profile?.full_name || 'Repartidor Sora',
            })
          );
        } catch (_) {}
      },
      (err) => {
        console.warn('Aviso de GPS:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 12000,
      }
    );
    setGpsWatchId(id);
    setSuccessBanner('📡 GPS en Vivo activado. Tus clientes pueden ver tu trayecto.');
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const stopGpsTransmission = () => {
    if (gpsWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
    }
    setIsTransmittingGps(false);
    setSuccessBanner('GPS en Vivo pausado.');
    setTimeout(() => setSuccessBanner(null), 2500);
  };

  useEffect(() => {
    return () => {
      if (gpsWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, [gpsWatchId]);

  // 1. Cargar pedidos asignados desde almacenamiento local y Supabase
  const loadAssignedOrders = async () => {
    setIsLoading(true);

    // Carga inicial rápida de respaldo local
    const cachedOrders = getStoredOrders();
    if (cachedOrders && cachedOrders.length > 0) {
      if (role === 'delivery' && user?.id) {
        setOrders(cachedOrders.filter((o) => o.delivery_user_id === user.id));
      } else {
        setOrders(cachedOrders);
      }
    }

    try {
      let query = supabase.from('orders').select('*');

      // Si el rol es 'delivery', filtrar solo los asignados a este repartidor
      if (role === 'delivery' && user?.id) {
        query = query.eq('delivery_user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setOrders(data as Order[]);
        saveStoredOrders(data as Order[]);
      }
    } catch (err) {
      console.warn('Conexión inicial de delivery, usando respaldo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedOrders();

    // Sincronización en tiempo real vía WebSockets para repartidores
    const channel = supabase
      .channel('delivery-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new) {
            const incoming = payload.new as Order;
            const isForMe = role === 'delivery' ? incoming.delivery_user_id === user?.id : true;
            if (isForMe) {
              setOrders((prev) => {
                if (prev.some((o) => o.id === incoming.id)) return prev;
                const next = [incoming, ...prev];
                saveStoredOrders(next);
                return next;
              });
              triggerKitchenAlert(
                '¡Nueva Entrega Disponible!',
                `Pedido #${incoming.order_number || ''} para ${incoming.client_name || 'Cliente'}. Destino: ${incoming.address || ''}`,
                'delivery_assigned',
                incoming.order_number
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new) {
            const incoming = payload.new as Order;
            const isForMe = role === 'delivery' ? incoming.delivery_user_id === user?.id : true;
            setOrders((prev) => {
              if (isForMe) {
                const exists = prev.some((o) => o.id === incoming.id);
                const next = exists
                  ? prev.map((o) => (o.id === incoming.id ? { ...o, ...incoming } : o))
                  : [incoming, ...prev];
                saveStoredOrders(next);
                return next;
              } else {
                const next = prev.filter((o) => o.id !== incoming.id);
                saveStoredOrders(next);
                return next;
              }
            });

            // Si fue recién asignado a este repartidor
            if (
              role === 'delivery' &&
              incoming.delivery_user_id === user?.id &&
              payload.old?.delivery_user_id !== user?.id
            ) {
              triggerKitchenAlert(
                '¡Pedido Asignado a Ti!',
                `Pedido #${incoming.order_number || ''} para ${incoming.client_name || 'Cliente'}.`,
                'delivery_assigned',
                incoming.order_number
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.old) {
            const deletedId = payload.old.id;
            setOrders((prev) => {
              const next = prev.filter((o) => o.id !== deletedId);
              saveStoredOrders(next);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, supabase]);

  const isStatusActive = (st: string) => {
    const s = (st || '').toLowerCase().trim();
    return s === 'pendiente' || s === 'en preparacion' || s === 'en camino';
  };

  const activeOrders = useMemo(() => {
    return orders.filter((o) => isStatusActive(o.status));
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => (o.status || '').toLowerCase() === 'entregado');
  }, [orders]);

  // 2. Acción: Iniciar Ruta (cambia estado a 'En Camino')
  const handleStartRoute = async (orderId: string) => {
    const updated: Order[] = orders.map((o) =>
      o.id === orderId ? { ...o, status: 'En Camino' as OrderStatus } : o
    );
    setOrders(updated);
    saveStoredOrders(updated);

    try {
      if (isValidUuid(orderId)) {
        await supabase
          .from('orders')
          .update({ status: 'En Camino', updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }
    } catch (err) {
      console.warn('Actualización local de estado');
    }

    if (!isTransmittingGps) {
      startGpsTransmission();
    }

    setSuccessBanner('¡Ruta iniciada! El cliente sabe que vas en camino y su mapa está sincronizado.');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // 3. Acción: Confirmar Entrega
  const confirmDelivery = async () => {
    if (!orderToDeliver) return;

    setIsDelivering(true);
    const updated: Order[] = orders.map((o) =>
      o.id === orderToDeliver.id ? { ...o, status: 'Entregado' as OrderStatus } : o
    );
    setOrders(updated);
    saveStoredOrders(updated);

    try {
      if (isValidUuid(orderToDeliver.id)) {
        await supabase
          .from('orders')
          .update({ status: 'Entregado', updated_at: new Date().toISOString() })
          .eq('id', orderToDeliver.id);
      }
    } catch (err) {
      console.warn('Actualización local a entregado');
    }

    setSuccessBanner(`¡Pedido #${orderToDeliver.order_number} entregado con éxito! 🎉`);
    setIsDelivering(false);
    setOrderToDeliver(null);

    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <AppNavigation>
      <div className="max-w-md mx-auto space-y-4 pb-12 sm:max-w-xl md:max-w-2xl">
        {/* CABECERA ERGONÓMICA PARA REPARTIDOR (IPAD Y MÓVIL) */}
        <div className="bg-white/95 dark:bg-[#141824]/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-border-sora dark:border-[#232B3E] shadow-sora sticky top-16 lg:top-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-md shadow-primary-sora/25 flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                    Repartidor en Ruta
                  </span>
                  <span className="text-[10px] text-text-sora/40 dark:text-slate-400 font-mono">DOP (RD$)</span>
                </div>
                <h1 className="font-serif font-bold text-lg text-text-sora dark:text-white truncate leading-tight mt-0.5">
                  {profile?.full_name || 'Repartidor Sora'}
                </h1>
                <p className="text-[11px] text-text-sora/60 dark:text-slate-400 truncate">
                  {activeOrders.length} pedido(s) activo(s) para entregar
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={isTransmittingGps ? stopGpsTransmission : startGpsTransmission}
                className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                  isTransmittingGps
                    ? 'bg-emerald-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-300'
                    : 'bg-bg-sora hover:bg-border-sora/60 border border-border-sora text-text-sora/80'
                }`}
                title={
                  isTransmittingGps
                    ? 'GPS transmitiendo en tiempo real a los clientes (clic para pausar)'
                    : 'Activar GPS en tiempo real para que los clientes vean tu trayecto en el mapa'
                }
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${
                      isTransmittingGps ? 'bg-white animate-ping opacity-75' : 'bg-gray-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isTransmittingGps ? 'bg-white' : 'bg-gray-500'
                    }`}
                  />
                </span>
                <span className="hidden sm:inline">
                  {isTransmittingGps ? 'GPS en Vivo' : 'Activar GPS'}
                </span>
                <span className="sm:hidden">{isTransmittingGps ? 'GPS ●' : 'GPS'}</span>
              </button>

              <button
                onClick={loadAssignedOrders}
                disabled={isLoading}
                aria-label="Actualizar pedidos"
                className="p-2.5 rounded-2xl bg-bg-sora hover:bg-border-sora/50 border border-border-sora text-text-sora transition-all active:scale-95 disabled:opacity-50"
                title="Actualizar pedidos asignados"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
              </button>
            </div>
          </div>

          {/* Pestañas ergonómicas */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-border-sora">
            <button
              onClick={() => setActiveTab('activos')}
              className={`py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'activos'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'bg-bg-sora/60 text-text-sora/70 hover:bg-bg-sora'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pendientes ({activeOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ruta')}
              className={`py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'ruta'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-primary-sora/10 text-primary-sora hover:bg-primary-sora/20 border border-primary-sora/30'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-rose-500" />
              <span>Ruta Óptima</span>
              {activeOrders.length >= 2 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`py-2.5 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'historial'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'bg-bg-sora/60 text-text-sora/70 hover:bg-bg-sora'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Entregados ({deliveredOrders.length})</span>
            </button>
          </div>
        </div>

        {/* NOTIFICACIÓN DE ACCIÓN RÁPIDA */}
        {successBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{successBanner}</span>
          </div>
        )}

        {/* LISTADO DE PEDIDOS ACTIVOS EN RUTA */}
        {activeTab === 'activos' && (
          <div className="space-y-4">
            {/* BANNER DE ACCESO DIRECTO A RUTA ÓPTIMA CUANDO HAY 2 O MÁS PEDIDOS */}
            {activeOrders.length >= 2 && (
              <div
                onClick={() => setActiveTab('ruta')}
                className="p-3.5 rounded-3xl bg-slate-900 text-white cursor-pointer shadow-md hover:bg-black transition-all flex items-center justify-between group active:scale-[0.98] border border-slate-800"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-2xl bg-primary-sora text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Navigation className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-1.5">
                      <span>Preparar Ruta Óptima</span>
                      <span className="text-[10px] font-mono bg-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded-full">
                        {activeOrders.length} entregas
                      </span>
                    </h4>
                    <p className="text-[11px] text-white/70 mt-0.5">
                      Ordena las paradas para ahorrar tiempo y combustible
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-rose-300 group-hover:translate-x-1 transition-transform">
                  <span>Ver Ruta</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}
            {activeOrders.map((order) => {
              const cleanPhone = cleanPhoneNumber(order.client_phone);
              const clientFirstName = order.client_name.split(' ')[0];
              const trackingBaseUrl =
                typeof window !== 'undefined'
                  ? window.location.origin
                  : 'https://sora-cocina-casera-git-main-pppt1.vercel.app';
              const trackingLink = `${trackingBaseUrl}/rastreo/${order.order_number}`;

              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `¡Hola ${clientFirstName}! 🛵 Tu repartidor de Sora Cocina Casera va en camino con tu pedido #${order.order_number}.\n\nPuedes seguir la entrega en tiempo real aquí:\n👉 ${trackingLink}`
              )}`;
              const callUrl = `tel:${cleanPhone}`;

              const googleMapsUrl =
                order.latitude && order.longitude
                  ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;

              const wazeUrl =
                order.latitude && order.longitude
                  ? `https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes`
                  : `https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes`;

              const isPaid = order.payment_status === 'pagado';
              const isEnCamino = (order.status || '').toLowerCase() === 'en camino';
              const urgency = calculateOrderUrgency(order);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-5 border shadow-sora transition-all space-y-4 ${
                    isEnCamino
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : urgency.urgencyLevel === 'overdue' || urgency.urgencyLevel === 'critical'
                      ? `${urgency.borderClass} ${urgency.bgTintClass}`
                      : 'border-border-sora'
                  }`}
                >
                  {/* BADGE DESTACADO DE PAGO EN MONEDA DOP */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-primary-sora bg-bg-sora px-2.5 py-1 rounded-xl border border-border-sora">
                        #{order.order_number}
                      </span>
                      {urgency.urgencyLevel !== 'normal' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${urgency.badgeClass}`}>
                          {urgency.badgeLabel}
                        </span>
                      )}
                    </div>

                    {isPaid ? (
                      <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>PAGADO</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-primary-sora text-white font-bold text-xs tracking-wide shadow-sm animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        <span>COBRAR: {formatCurrency(parseFloat(order.total as any) || 0)}</span>
                      </div>
                    )}
                  </div>

                  {/* HORARIO PROGRAMADO DE ENTREGA */}
                  {(order.delivery_time || order.delivery_date) && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                        <span className="font-semibold">
                          {order.is_scheduled ? 'Programado:' : 'Hora de entrega:'}{' '}
                          <span className="font-bold text-amber-950">
                            {order.delivery_time || 'Inmediata'}
                          </span>
                        </span>
                      </div>
                      {order.delivery_date && (
                        <div className="flex items-center space-x-1 text-[11px] font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                          <Calendar className="w-3 h-3" />
                          <span>{order.delivery_date}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CLIENTE Y PRODUCTOS */}
                  <div className="space-y-1.5">
                    <h2 className="font-serif font-bold text-xl text-text-sora">
                      {order.client_name}
                    </h2>

                    <div className="p-3 rounded-2xl bg-bg-sora/60 border border-border-sora/80 space-y-1">
                      <div className="flex items-center space-x-1 text-[10px] uppercase font-bold text-text-sora/50 tracking-wider">
                        <Package className="w-3 h-3" />
                        <span>Contenido del Pedido</span>
                      </div>
                      <div className="text-xs text-text-sora font-medium space-y-0.5">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>• {it.quantity}x {it.name}</span>
                              <span className="font-mono text-text-sora/60 text-[11px]">
                                {formatCurrency(it.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="italic text-text-sora/70">Platos caseros Sora</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DIRECCIÓN Y REFERENCIAS */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start space-x-2 text-text-sora">
                      <MapPin className="w-4 h-4 text-primary-sora flex-shrink-0 mt-0.5" />
                      <span className="font-bold text-sm leading-snug">{order.address}</span>
                    </div>

                    {order.address_reference && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
                        <p className="font-semibold text-[10px] uppercase tracking-wider text-amber-800">
                          Instrucciones / Referencia:
                        </p>
                        <p className="mt-0.5 leading-relaxed font-medium">
                          {order.address_reference}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* NAVEGACIÓN GPS (GOOGLE MAPS Y WAZE) */}
                  <div className="pt-1 space-y-2">
                    <p className="text-[10px] font-bold text-text-sora/50 uppercase tracking-wider">
                      Navegación GPS con un solo toque
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 py-3 px-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md active:scale-95 text-center min-h-[48px]"
                      >
                        <Navigation className="w-4 h-4 text-rose-400" />
                        <span>Google Maps</span>
                      </a>

                      <a
                        href={wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 py-3 px-3 rounded-2xl bg-[#33CCFF] hover:bg-[#20b8eb] text-slate-900 text-xs font-bold transition-all shadow-md active:scale-95 text-center min-h-[48px]"
                      >
                        <Compass className="w-4 h-4 text-slate-900" />
                        <span>Waze</span>
                      </a>
                    </div>
                  </div>

                  {/* COMUNICACIÓN (WHATSAPP & LLAMAR) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-2xl bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-md active:scale-95 text-center min-h-[48px]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Cliente</span>
                    </a>

                    <a
                      href={callUrl}
                      className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-2xl bg-white border-2 border-border-sora hover:bg-bg-sora text-text-sora text-xs font-bold transition-all shadow-sm active:scale-95 text-center min-h-[48px]"
                    >
                      <Phone className="w-4 h-4 text-primary-sora" />
                      <span>Llamar</span>
                    </a>
                  </div>

                  {/* CAMBIO DE ESTADOS */}
                  <div className="pt-2 border-t border-border-sora">
                    {!isEnCamino ? (
                      <button
                        onClick={() => handleStartRoute(order.id)}
                        className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 active:scale-98 min-h-[48px]"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Iniciar Ruta (Avisar Salida)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setOrderToDeliver(order)}
                        className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/30 active:scale-98 min-h-[48px]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Marcar como Entregado</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {activeOrders.length === 0 && (
              <div className="p-8 text-center bg-white/80 rounded-3xl border border-border-sora shadow-sm space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-text-sora">
                  ¡No tienes pedidos pendientes!
                </h3>
                <p className="text-xs text-text-sora/60 max-w-xs mx-auto">
                  Has completado todos tus repartos asignados. Pulsa en actualizar cuando cocina despache nuevos pedidos.
                </p>
                <button
                  onClick={loadAssignedOrders}
                  className="px-4 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold shadow-sm hover:bg-primary-hover transition-colors"
                >
                  Actualizar Lista
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: PREPARADOR DE RUTA ÓPTIMA MULTI-PARADA */}
        {activeTab === 'ruta' && (
          <DeliveryRoutePlanner
            orders={activeOrders}
            onMarkAsDelivered={(ord) => setOrderToDeliver(ord)}
            onStartRoute={handleStartRoute}
          />
        )}

        {/* PESTAÑA HISTORIAL: PEDIDOS ENTREGADOS */}
        {activeTab === 'historial' && (
          <div className="space-y-3">
            {deliveredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white/70 rounded-2xl p-4 border border-border-sora shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-text-sora/60">
                      #{order.order_number}
                    </span>
                    <span className="font-semibold text-xs text-text-sora">
                      {order.client_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-sora/50 truncate max-w-[200px]">
                    {order.address}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Entregado
                  </span>
                  <p className="text-[11px] text-text-sora/60 font-mono mt-0.5">
                    {formatCurrency(parseFloat(order.total as any) || 0)}
                  </p>
                </div>
              </div>
            ))}

            {deliveredOrders.length === 0 && (
              <div className="p-8 text-center text-xs text-text-sora/50">
                Aún no has marcado pedidos entregados en este turno.
              </div>
            )}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN RÁPIDA */}
        {orderToDeliver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-border-sora shadow-2xl space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif font-bold text-lg text-text-sora">
                  ¿Confirmar Entrega?
                </h3>
                <p className="text-xs text-text-sora/70">
                  ¿Confirmas que entregaste el pedido <strong>#{orderToDeliver.order_number}</strong> a <strong>{orderToDeliver.client_name}</strong>?
                </p>
              </div>

              {orderToDeliver.payment_status === 'cobrar_contra_entrega' && (
                <div className="p-3.5 rounded-2xl bg-primary-sora/10 border border-primary-sora/30 text-xs text-primary-sora text-center">
                  <p className="font-bold uppercase tracking-wider text-[11px]">
                    ⚠️ Asegúrate de haber cobrado:
                  </p>
                  <p className="text-lg font-bold font-mono mt-0.5">
                    {formatCurrency(parseFloat(orderToDeliver.total as any) || 0)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDeliver(null)}
                  disabled={isDelivering}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-text-sora/70 bg-bg-sora hover:bg-border-sora/50 border border-border-sora transition-all"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={confirmDelivery}
                  disabled={isDelivering}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/30 active:scale-95"
                >
                  {isDelivering ? 'Actualizando...' : 'Sí, Entregado'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}
