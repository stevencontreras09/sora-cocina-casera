'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  isSoundEnabled,
  setSoundEnabled,
  playKitchenChime,
  triggerKitchenAlert,
  KitchenAlertPayload,
} from '@/lib/audioAlerts';
import {
  Bell,
  Volume2,
  VolumeX,
  X,
  Flame,
  Truck,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export function KitchenAlertBanner() {
  const supabase = useMemo(() => createClient(), []);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [currentAlert, setCurrentAlert] = useState<KitchenAlertPayload | null>(null);
  const [showSoundTestToast, setShowSoundTestToast] = useState(false);

  useEffect(() => {
    setSoundActive(isSoundEnabled());

    const handleSoundPref = (e: any) => {
      setSoundActive(e.detail?.enabled);
    };

    const handleKitchenAlert = (e: any) => {
      const payload = e.detail as KitchenAlertPayload;
      if (payload) {
        setCurrentAlert(payload);
        // Ocultar la notificación flotante tras 7 segundos
        setTimeout(() => {
          setCurrentAlert((prev) => (prev?.timestamp === payload.timestamp ? null : prev));
        }, 7000);
      }
    };

    window.addEventListener('sora-sound-pref-changed', handleSoundPref);
    window.addEventListener('sora-kitchen-alert', handleKitchenAlert);

    // Conexión Supabase Realtime a la tabla 'orders'
    let channel: any = null;
    try {
      channel = supabase
        .channel('kitchen-realtime-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload: any) => {
            const newOrder = payload.new;
            triggerKitchenAlert(
              '¡Nueva Orden en Cocina!',
              `Pedido #${newOrder.order_number || ''} de ${newOrder.client_name || 'Cliente'}. Total: RD$ ${newOrder.total || 0}`,
              'new_order',
              newOrder.order_number
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload: any) => {
            const newOrder = payload.new;
            const oldOrder = payload.old;
            if (
              newOrder.delivery_user_id &&
              newOrder.delivery_user_id !== oldOrder?.delivery_user_id
            ) {
              triggerKitchenAlert(
                '¡Pedido Asignado a Delivery!',
                `Pedido #${newOrder.order_number || ''} asignado a ${newOrder.delivery_user_name || 'Repartidor'}.`,
                'delivery_assigned',
                newOrder.order_number
              );
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime Supabase en modo pasivo local');
    }

    return () => {
      window.removeEventListener('sora-sound-pref-changed', handleSoundPref);
      window.removeEventListener('sora-kitchen-alert', handleKitchenAlert);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const toggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playKitchenChime();
      setShowSoundTestToast(true);
      setTimeout(() => setShowSoundTestToast(false), 2500);
    }
  };

  const handleTestChime = () => {
    playKitchenChime();
    setShowSoundTestToast(true);
    setTimeout(() => setShowSoundTestToast(false), 2500);
  };

  return (
    <>
      {/* 1. TOAST / BANNER FLOTANTE DE ALERTA DE COCINA EN TIEMPO REAL */}
      {currentAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-3xl bg-primary-sora text-white shadow-2xl border-2 border-white/20 flex items-start space-x-3.5 backdrop-blur-md">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
              {currentAlert.type === 'delivery_assigned' ? (
                <Truck className="w-5 h-5 text-white" />
              ) : currentAlert.type === 'production_reminder' ? (
                <Flame className="w-5 h-5 text-amber-300" />
              ) : (
                <Bell className="w-5 h-5 text-yellow-300" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                  {currentAlert.type === 'delivery_assigned'
                    ? 'Despacho Delivery'
                    : currentAlert.type === 'production_reminder'
                    ? 'Recordatorio Producción'
                    : 'Nueva Orden Cocina'}
                </span>
                {currentAlert.orderNumber && (
                  <span className="text-xs font-mono font-bold text-white/90">
                    {currentAlert.orderNumber}
                  </span>
                )}
              </div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-white mt-1">
                {currentAlert.title}
              </h4>
              <p className="text-xs text-white/90 mt-0.5 leading-snug">
                {currentAlert.message}
              </p>
            </div>

            <button
              onClick={() => setCurrentAlert(null)}
              className="p-1 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. CONFIRMACIÓN AL PROBAR TIMBRE */}
      {showSoundTestToast && (
        <div className="fixed bottom-16 right-4 z-40 bg-text-sora text-white px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-lg flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>¡Timbre de cocina funcionando perfectamente! 🔔</span>
        </div>
      )}

      {/* 3. CONTROL DE SONIDO FLOTANTE DISCRETO (SIEMPRE DISPONIBLE EN EL HEADER/PANTALLA) */}
      <div className="hidden lg:flex items-center space-x-1.5 fixed top-3.5 right-6 z-30">
        <button
          onClick={handleTestChime}
          title="Probar sonido de campana de cocina"
          className="px-2.5 py-1.5 rounded-xl border border-border-sora bg-white/90 hover:bg-bg-sora text-text-sora/80 text-[11px] font-semibold transition-all shadow-2xs hover:scale-102 flex items-center space-x-1"
        >
          <Bell className="w-3.5 h-3.5 text-primary-sora" />
          <span>Probar Timbre</span>
        </button>

        <button
          onClick={toggleSound}
          title={soundActive ? 'Silenciar campana de pedidos' : 'Activar campana de pedidos'}
          className={`p-1.5 rounded-xl border transition-all shadow-2xs flex items-center space-x-1 text-[11px] font-semibold ${
            soundActive
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-border-sora bg-white text-text-sora/50'
          }`}
        >
          {soundActive ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden xl:inline text-[10px]">Sonido ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-text-sora/40" />
              <span className="hidden xl:inline text-[10px]">Silenciado</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
