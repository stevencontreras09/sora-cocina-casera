'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  MapPin,
  DollarSign,
  Printer,
  Volume2,
  PackageCheck,
} from 'lucide-react';

export function SystemUpdateNotice() {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Leer estado de visibilidad del banner desde localStorage
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('sora_update_banner_v1_2_dismissed');
      if (dismissed === 'true') {
        setIsBannerVisible(false);
      }
    } catch (e) {
      // Ignorar errores en modo SSR o sandbox
    }
  }, []);

  const handleDismissBanner = () => {
    setIsBannerVisible(false);
    try {
      localStorage.setItem('sora_update_banner_v1_2_dismissed', 'true');
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
                  Actualización v1.2.0
                </span>
                <span className="font-medium">
                  Moneda DOP (RD$), accesos personalizados por función y optimización para iPad y móvil.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-primary-sora/10 transition-colors"
              >
                <span>Ver Próximas Mejoras</span>
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
        <span className="group-hover:text-primary-sora transition-colors">v1.2.0 • Novedades</span>
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
                    Actualizaciones y Mejoras del Sistema
                  </h3>
                  <p className="text-xs text-text-sora/60 mt-0.5">
                    Sora Cocina Casera • Registro de cambios y próximas funciones
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
              {/* Sección 1: Versión Actual */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Versión Actual (v1.2.0)
                  </span>
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    ● Desplegada en Producción
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Moneda Dominicana (DOP / RD$)</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Todas las ventas, gastos, balances y platos operan bajo la moneda oficial dominicana con formato RD$.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-primary-sora" />
                      <span>Control Granular de Funciones</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      El administrador puede activar o desactivar individualmente el acceso a Ventas, Clientes, Gastos, Delivery y Reportes para cada usuario.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Optimización para iPad y Celulares</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Diseño adaptable que aprovecha el 100% de la pantalla del iPad en vertical y botones grandes para una sola mano en móviles.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-bg-sora/70 border border-border-sora space-y-1.5">
                    <div className="flex items-center space-x-2 text-text-sora font-bold text-xs">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>Geolocalización Santo Domingo</span>
                    </div>
                    <p className="text-[11px] text-text-sora/70 leading-relaxed">
                      Google Maps y buscador de direcciones enfocado en República Dominicana, con navegación GPS hacia Waze en un toque.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 2: Próximas Actualizaciones Planificadas */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                    Próximas Actualizaciones (Hoja de Ruta v1.3)
                  </span>
                  <span className="text-text-sora/50 font-medium text-[11px]">
                    Próximamente
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl border border-primary-sora/30 bg-primary-sora/5 flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-sora/15 text-primary-sora flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-sora text-xs">
                        1. Alertas Sonoras en Tiempo Real
                      </h4>
                      <p className="text-[11px] text-text-sora/70 mt-0.5 leading-relaxed">
                        Campana y vibración auditiva inmediata en la cocina y despacho cada vez que se ingrese una nueva orden o se asigne un delivery.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border-sora bg-white flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-sora text-xs">
                        2. Impresión de Comandas Térmicas y Facturas PDF
                      </h4>
                      <p className="text-[11px] text-text-sora/70 mt-0.5 leading-relaxed">
                        Formato optimizado para impresoras térmicas de 58mm y 80mm para comandas de cocina y tickets de entrega de motoristas.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border-sora bg-white flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-sora text-xs">
                        3. Control de Stock e Inventario Diario
                      </h4>
                      <p className="text-[11px] text-text-sora/70 mt-0.5 leading-relaxed">
                        Descuento automático de raciones de comida preparada y notificación preventiva antes de que se agoten las porciones del menú diario.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota final de retroalimentación */}
              <div className="p-4 rounded-2xl bg-bg-sora border border-border-sora flex items-center space-x-3">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-[11px] text-text-sora/80">
                  ¿Tienes una sugerencia o función específica que necesites para tu operación diaria? Solicítala al administrador para incluirla en la próxima versión.
                </p>
              </div>
            </div>

            {/* Pie del modal */}
            <div className="px-6 py-4 border-t border-border-sora bg-bg-sora/30 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-text-sora/50 font-mono">
                Sora Web App • Build 2026.10
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
