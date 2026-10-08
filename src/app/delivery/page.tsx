'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Order, OrderStatus } from '@/types/database.types';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import { getStoredOrders, saveStoredOrders, isValidUuid } from '@/lib/storage';
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
} from 'lucide-react';

export default function DeliveryMobilePage() {
  const { user, profile, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Lista limpia inicial con carga desde almacenamiento local si existe
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');

  // Modal de confirmación para "Marcar como Entregado"
  const [orderToDeliver, setOrderToDeliver] = useState<Order | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, supabase]);

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

    setSuccessBanner('¡Ruta iniciada! El cliente sabe que vas en camino.');
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
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-border-sora shadow-sora sticky top-16 lg:top-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-md shadow-primary-sora/25 flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Repartidor en Ruta
                  </span>
                  <span className="text-[10px] text-text-sora/40 font-mono">DOP (RD$)</span>
                </div>
                <h1 className="font-serif font-bold text-lg text-text-sora truncate leading-tight mt-0.5">
                  {profile?.full_name || 'Repartidor Sora'}
                </h1>
                <p className="text-[11px] text-text-sora/60 truncate">
                  {activeOrders.length} pedido(s) activo(s) para entregar
                </p>
              </div>
            </div>

            <button
              onClick={loadAssignedOrders}
              disabled={isLoading}
              aria-label="Actualizar pedidos"
              className="p-3 rounded-2xl bg-bg-sora hover:bg-border-sora/50 border border-border-sora text-text-sora transition-all active:scale-95 disabled:opacity-50"
              title="Actualizar pedidos asignados"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
          </div>

          {/* Pestañas ergonómicas */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border-sora">
            <button
              onClick={() => setActiveTab('activos')}
              className={`py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'activos'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'bg-bg-sora/60 text-text-sora/70 hover:bg-bg-sora'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Pendientes ({activeOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'historial'
                  ? 'bg-primary-sora text-white shadow-sm'
                  : 'bg-bg-sora/60 text-text-sora/70 hover:bg-bg-sora'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
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
            {activeOrders.map((order) => {
              const cleanPhone = cleanPhoneNumber(order.client_phone);
              const clientFirstName = order.client_name.split(' ')[0];
              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hola ${clientFirstName}, soy el delivery de Sora Cocina Casera, voy en camino con tu pedido.`
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

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-5 border shadow-sora transition-all space-y-4 ${
                    isEnCamino ? 'border-primary-sora/60 ring-2 ring-primary-sora/10' : 'border-border-sora'
                  }`}
                >
                  {/* BADGE DESTACADO DE PAGO EN MONEDA DOP */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-primary-sora bg-bg-sora px-2.5 py-1 rounded-xl border border-border-sora">
                        #{order.order_number}
                      </span>
                      <span className="text-[11px] font-semibold text-text-sora/50">
                        {order.created_at}
                      </span>
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
