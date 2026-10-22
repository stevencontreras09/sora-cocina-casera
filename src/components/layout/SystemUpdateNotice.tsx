'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  Lightbulb,
  ShieldCheck,
  Smartphone,
  MapPin,
  DollarSign,
  Printer,
  Volume2,
  PackageCheck,
  Truck,
  Edit3,
} from 'lucide-react';

export function SystemUpdateNotice() {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Leer estado de visibilidad del banner desde localStorage para la v1.2.2
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('sora_update_banner_v1_2_2_dismissed');
      if (dismissed === 'true') {
        setIsBannerVisible(false);
      }
    } catch (e) {
      // Ignorar errores en SSR o sandbox
    }
  }, []);

  const handleDismissBanner = () => {
    setIsBannerVisible(false);
    try {
      localStorage.setItem('sora_update_banner_v1_2_2_dismissed', 'true');
    } catch (e) {}
  };

  return (
    <>
      {/* 1. BANNER VISIBLE EN LA PARTE SUPERIOR */}
      {isBannerVisible && (
        <div className="bg-gradient-to-r from-primary-sora/15 via-bg-sora to-amber-500/10 border-b border-primary-sora/25 px-4 py-2.5 sm:px-6 transition-all animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center space-x-2.5">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-sora text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <div className="text-xs text-text-sora">
                <span className="font-bold text-primary-sora mr-1.5 uppercase tracking-wider text-[11px] bg-primary-sora/10 px-2 py-0.5 rounded-full border border-primary-sora/20">
                  Actualización v1.2.2
                </span>
                <span className="font-medium">
                  Pedidos en tiempo real con WebSockets (sin refrescar) y link público de rastreo en vivo para clientes por WhatsApp.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-primary-sora/10 transition-colors"
              >
                <span>Ver Novedades</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDismissBanner}
                aria-label="Cerrar aviso de actualización"
                className="p-1 rounded-lg text-text-sora/40 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
                title="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. BOTÓN FLOTANTE DISCRETO PARA REVISAR ACTUALIZACIONES EN CUALQUIER MOMENTO */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md text-text-sora border border-border-sora shadow-lg hover:shadow-xl rounded-full px-3.5 py-2 flex items-center space-x-2 text-xs font-semibold hover:border-primary-sora/40 transition-all hover:scale-105 active:scale-95 group"
        title="Centro de Actualizaciones y Novedades"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-sora opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-sora" />
        </span>
        <span className="group-hover:text-primary-sora transition-colors">v1.2.2 • Novedades</span>
      </button>

      {/* 3. MODAL DETALLADO CON HOJA DE RUTA Y NOVEDADES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border-sora shadow-2xl overflow-hidden">
            {/* Cabecera del modal */}
            <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/50 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora leading-tight">
                    Novedades de la Versión v1.2.2
                  </h3>
                  <p className="text-xs text-text-sora/60 mt-0.5">
                    Sora Cocina Casera • Registro de mejoras y optimizaciones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-sora/80">
              {/* Sección 1: Versión Actual v1.2.2 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Versión Actual (v1.2.2)
                  </span>
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    ● Desplegada en Producción
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-primary-sora" />
                      <span>Sincronización en Tiempo Real</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Conexión WebSocket vía Supabase Realtime: cuando entra un pedido o cambia de estado, se actualiza al instante en Cocina, Delivery y Dashboard sin refrescar.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Link de Rastreo para Clientes</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Enlace público interactivo (/rastreo/ORD-XX) enviado por WhatsApp. El cliente ve en vivo cuándo su lasaña está en el horno o en camino con el motorista.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Campana de Cocina y Vibración</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Timbre de servicio sintetizado con Web Audio API que suena automáticamente al registrarse una nueva comanda o asignarse un despacho.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Seguridad y Permisos Granulares</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Control estricto de roles (Admin, Coadmin, Delivery), bloqueo instantáneo de cuentas inactivas y guardias de ruta en servidor y cliente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pie de notas */}
              <div className="p-4 rounded-2xl bg-bg-sora border border-border-sora flex items-center space-x-3">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-[11px] text-text-sora/80">
                  ¿Tienes alguna sugerencia para seguir optimizando Sora Cocina Casera? Comunícala al administrador del sistema.
                </p>
              </div>
            </div>

            {/* Pie del modal */}
            <div className="px-6 py-4 border-t border-border-sora bg-bg-sora/30 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-text-sora/50 font-mono">
                Sora Web App • Build v1.2.2
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
