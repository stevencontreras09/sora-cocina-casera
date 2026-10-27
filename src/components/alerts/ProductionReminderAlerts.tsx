'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '@/types/database.types';
import { triggerKitchenAlert } from '@/lib/audioAlerts';
import { buildWhatsAppLink, getLocalDateString } from '@/lib/utils';
import {
  Clock,
  Flame,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShoppingBag,
  Bell,
  Utensils,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sun,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

interface ProductionReminderAlertsProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: any) => Promise<void>;
}

export function ProductionReminderAlerts({
  orders,
  onUpdateOrderStatus,
}: ProductionReminderAlertsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<Set<string>>(new Set());

  // Filtrar pedidos pendientes o en preparación que tienen hora programada
  const activeScheduledOrders = orders.filter((o) => {
    const st = (o.status || '').toLowerCase();
    return st === 'pendiente' || st === 'en preparacion';
  });

  // Fecha de hoy YYYY-MM-DD local
  const todayStr = getLocalDateString();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Pedidos para HOY cuya producción debe iniciar de inmediato
  const urgentProductionOrders = activeScheduledOrders.filter((o) => {
    if (!o.delivery_date && !o.delivery_time) return false;

    const isToday = !o.delivery_date || o.delivery_date === todayStr;
    if (!isToday) return false;

    if (!o.delivery_time) return true; // Si es para hoy sin hora, requiere producción hoy

    // Parsear hora de entrega HH:mm
    const [h, m] = o.delivery_time.split(':').map((n) => parseInt(n, 10));
    if (isNaN(h)) return true;

    const deliveryTotalMinutes = h * 60 + (m || 0);
    // Margen de anticipación configurable para cocinar
    let leadMinutes = 60;
    if (o.production_reminder_time === '30m') leadMinutes = 30;
    else if (o.production_reminder_time === '45m') leadMinutes = 45;
    else if (o.production_reminder_time === '120m') leadMinutes = 120;
    else if (o.production_reminder_time === '180m') leadMinutes = 180;
    else if (o.production_reminder_time === '240m') leadMinutes = 240;
    else if (o.production_reminder_time === 'inicio_dia') {
      leadMinutes = Math.max(0, deliveryTotalMinutes - 8 * 60); // 8:00 AM
    } else if (o.production_reminder_time && o.production_reminder_time.includes(':')) {
      const [rh, rm] = o.production_reminder_time.split(':').map((n) => parseInt(n, 10));
      if (!isNaN(rh)) {
        return currentMinutes >= rh * 60 + (rm || 0);
      }
    }

    const productionTargetMinutes = deliveryTotalMinutes - leadMinutes;

    // Si ya estamos en o pasamos la hora de producción
    return currentMinutes >= productionTargetMinutes;
  });

  // Pedidos agendados para entregar hoy
  const todayScheduledOrders = activeScheduledOrders.filter((o) => {
    return o.delivery_date === todayStr;
  });

  // 2. Pedidos programados para fechas futuras (ej. mañana, dentro de 3 días)
  const futureScheduledOrders = activeScheduledOrders.filter((o) => {
    if (!o.delivery_date) return false;
    return o.delivery_date > todayStr;
  });

  // Sonar timbre si hay un pedido urgente que no ha sido notificado en esta sesión
  useEffect(() => {
    urgentProductionOrders.forEach((order) => {
      if (!notifiedOrderIds.has(order.id) && order.status === 'Pendiente') {
        triggerKitchenAlert(
          '⏰ ¡Hora de Cocinar!',
          `Comenzar producción para el pedido #${order.order_number} de ${order.client_name} (Entrega a las ${order.delivery_time || 'próximamente'}).`,
          'production_reminder',
          order.order_number
        );
        setNotifiedOrderIds((prev) => new Set(prev).add(order.id));
      }
    });
  }, [urgentProductionOrders, notifiedOrderIds]);

  if (urgentProductionOrders.length === 0 && futureScheduledOrders.length === 0 && todayScheduledOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* AVISO RESUMEN MATUTINO (PEDIDOS DEL DÍA) */}
      {todayScheduledOrders.length > 0 && (
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sun className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-amber-950">
                  ☀️ Resumen Matutino de Entregas (Hoy)
                </h3>
                <p className="text-[11px] text-amber-800">
                  Tienes <strong>{todayScheduledOrders.length} {todayScheduledOrders.length === 1 ? 'pedido agendado' : 'pedidos agendados'}</strong> para entregar hoy.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-amber-900 bg-white/90 border border-amber-300 px-2.5 py-1 rounded-xl shadow-2xs">
              {todayScheduledOrders.reduce((sum, o) => sum + (o.items?.reduce((is, it) => is + it.quantity, 0) || 1), 0)} porciones hoy
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/60">
            {todayScheduledOrders.map((o) => (
              <div
                key={o.id}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs flex items-center space-x-2 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-bold text-amber-950">{o.delivery_time || 'Sin hora'}</span>
                <span className="text-text-sora/40">•</span>
                <span className="font-medium text-text-sora">{o.client_name?.split(' ')[0]}</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">
                  #{o.order_number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. SECCIÓN DE PEDIDOS URGENTES (HORA DE COCINAR AHORA) */}
      {urgentProductionOrders.length > 0 && (
        <div className="rounded-3xl border-2 border-primary-sora/40 bg-gradient-to-r from-primary-sora/10 via-white to-amber-500/10 p-5 shadow-sora">
          <div className="flex items-center justify-between pb-3 border-b border-primary-sora/20">
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary-sora text-white flex items-center justify-center animate-pulse">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-text-sora">
                  ¡Comenzar Producción en Cocina! ({urgentProductionOrders.length})
                </h3>
                <p className="text-[11px] text-text-sora/70">
                  Pedidos programados para entregar hoy que deben comenzar a prepararse.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-sora text-white">
              Atención Inmediata
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentProductionOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white border border-border-sora shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary-sora">
                      #{order.order_number}
                    </span>
                    <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Entrega: {order.delivery_time ? `${order.delivery_time}` : 'Hoy'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-text-sora mt-1">
                    {order.client_name}
                  </h4>
                  <p className="text-[11px] text-text-sora/60 flex items-center mt-0.5">
                    <MapPin className="w-3 h-3 mr-1 text-text-sora/40" />
                    <span>{order.address || 'Retiro en local'}</span>
                  </p>

                  {/* Detalle de platos a cocinar */}
                  <div className="mt-2.5 pt-2 border-t border-border-sora/50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-text-sora/40 tracking-wider">
                      Platos a preparar:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-bg-sora text-text-sora text-[11px] font-medium border border-border-sora/60"
                        >
                          {it.quantity}x {it.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-2 border-t border-border-sora flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-sora">
                    Total: RD$ {order.total?.toLocaleString('es-DO')}
                  </span>

                  {onUpdateOrderStatus && order.status === 'Pendiente' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'En Preparacion')}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary-sora hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Iniciar Cocina</span>
                    </button>
                  )}

                  {order.status === 'En Preparacion' && (
                    <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                      ✓ En Preparación
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN DE PEDIDOS PROGRAMADOS PARA PRÓXIMOS DÍAS */}
      {futureScheduledOrders.length > 0 && (
        <div className="rounded-3xl border border-border-sora bg-white/90 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-serif font-bold text-sm text-text-sora">
                  Pedidos Programados a Futuro ({futureScheduledOrders.length})
                </h4>
                <p className="text-[11px] text-text-sora/60">
                  Anticipaciones registradas para los próximos días. La app te avisará a la hora de producir.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-xl text-text-sora/50 hover:bg-bg-sora"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!collapsed && (
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border-sora/60">
              {futureScheduledOrders.map((order) => {
                // Formatear fecha
                const [y, m, d] = (order.delivery_date || '').split('-');
                const dateLabel = `${d}/${m}/${y}`;

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl bg-bg-sora/40 border border-border-sora space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-text-sora">
                        #{order.order_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {dateLabel} {order.delivery_time ? `• ${order.delivery_time}` : ''}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-text-sora">{order.client_name}</p>
                      <p className="text-[11px] text-text-sora/60 truncate">
                        {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border-sora/50 flex items-center justify-between gap-1 text-[11px]">
                      <a
                        href={buildWhatsAppLink(
                          order.client_phone || '',
                          `¡Hola ${order.client_name}! Te saludamos de Sora Cocina Casera 🍲.\n\n` +
                          `Te confirmamos con gusto tu pedido #${order.order_number} agendado para el ${dateLabel}${order.delivery_time ? ` a las ${order.delivery_time}` : ''}.\n\n` +
                          `• Platos:\n` +
                          order.items.map((i) => `  - ${i.quantity}x ${i.name}`).join('\n') +
                          `\n• Total: RD$ ${order.total?.toLocaleString('es-DO')}` +
                          `\n\nTu orden está en nuestra lista de horneado artesanal. ¿Todo listo para recibirlo? ¡Que pases un excelente día!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] transition-all shadow-2xs"
                        title="Enviar recordatorio por WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Recordar WhatsApp</span>
                      </a>
                      <span className="font-bold text-text-sora">
                        RD$ {order.total?.toLocaleString('es-DO')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
