'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  ShieldCheck,
  Truck,
  Volume2,
  Clock,
  ArrowUpCircle,
  Lightbulb,
} from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  CURRENT_RELEASE_TITLE,
  CURRENT_RELEASE_HIGHLIGHTS,
  applyAppUpdate,
} from '@/lib/version';

export function SystemUpdateNotice() {
  const [showPopup, setShowPopup] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>(CURRENT_APP_VERSION);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Comprobar si hay una versión pendiente de actualizar
  const checkPendingUpdate = useCallback((latestVersion: string) => {
    try {
      const installedVersion = localStorage.getItem('sora_installed_version');
      const dismissedVersion = localStorage.getItem('sora_update_dismissed_version');

      // Si la versión instalada en el navegador es anterior a la disponible
      if (!installedVersion || installedVersion !== latestVersion) {
        // Si el usuario aún no la pospuso en esta sesión para esta versión específica
        if (dismissedVersion !== latestVersion) {
          setShowPopup(true);
        }
        setIsBannerVisible(true);
      }
    } catch (e) {
      console.warn('Error leyendo localStorage de versión:', e);
    }
  }, []);

  // Consultar periódicamente la versión viva en el servidor (sin caché)
  const fetchServerVersion = useCallback(async () => {
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.version) {
          setServerVersion(data.version);
          checkPendingUpdate(data.version);
        }
      }
    } catch (err) {
      // Si falla la red o está offline, ignorar silenciosamente
    }
  }, [checkPendingUpdate]);

  useEffect(() => {
    // 1. Verificación inicial inmediata
    checkPendingUpdate(CURRENT_APP_VERSION);

    // 2. Consultar al servidor de inmediato
    fetchServerVersion();

    // 3. Chequeo periódico cada 60 segundos por si se hace un nuevo despliegue
    const interval = setInterval(fetchServerVersion, 60000);

    // 4. Chequear cuando el usuario regresa a la pestaña (focus / visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchServerVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchServerVersion);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchServerVersion);
    };
  }, [checkPendingUpdate, fetchServerVersion]);

  // Manejador del botón de actualizar
  const handleUpdateNow = async () => {
    setIsUpdating(true);
    await applyAppUpdate(serverVersion || CURRENT_APP_VERSION);
  };

  // Posponer temporalmente el popup
  const handleDismissPopup = () => {
    setShowPopup(false);
    try {
      localStorage.setItem('sora_update_dismissed_version', serverVersion || CURRENT_APP_VERSION);
    } catch (e) {}
  };

  const handleDismissBanner = () => {
    setIsBannerVisible(false);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MENSAJE EMERGENTE MODAL DE ACTUALIZACIÓN (POPUP)       */}
      {/* ========================================================= */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-border-sora shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Cabecera con degradado y badges */}
            <div className="p-6 bg-gradient-to-br from-primary-sora/15 via-bg-sora to-amber-500/10 border-b border-border-sora relative">
              <button
                onClick={handleDismissPopup}
                disabled={isUpdating}
                className="absolute top-4 right-4 p-2 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-black/5 transition-colors disabled:opacity-30"
                title="Actualizar más tarde"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-sora text-white flex items-center justify-center shadow-lg shadow-primary-sora/25 flex-shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-sora text-white shadow-sm">
                    ✨ Nueva Versión Disponible
                  </span>
                  <p className="text-xs text-text-sora/60 font-semibold mt-0.5">
                    Sora Cocina Casera • v{serverVersion || CURRENT_APP_VERSION}
                  </p>
                </div>
              </div>

              <h2 className="font-serif font-bold text-xl sm:text-2xl text-text-sora leading-tight">
                ¡Hay una nueva versión de la app disponible!
              </h2>
              <p className="text-xs text-text-sora/80 mt-1.5 leading-relaxed">
                Hemos publicado mejoras importantes en el sistema. Para aplicar los cambios y disfrutar de todas las nuevas funciones al instante, por favor actualiza la aplicación.
              </p>
            </div>

            {/* Lista de mejoras destacadas */}
            <div className="p-6 space-y-3 bg-white">
              <p className="text-[11px] font-bold text-text-sora/50 uppercase tracking-wider">
                ¿Qué incluye esta versión?
              </p>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {CURRENT_RELEASE_HIGHLIGHTS.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-3 p-3 rounded-2xl bg-bg-sora/60 border border-border-sora/60"
                  >
                    <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-text-sora">{item.title}</p>
                      <p className="text-[11px] text-text-sora/70 leading-relaxed mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de acción del mensaje emergente */}
            <div className="p-5 border-t border-border-sora bg-bg-sora/40 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={handleUpdateNow}
                disabled={isUpdating}
                className="w-full sm:flex-1 flex items-center justify-center space-x-2.5 px-5 py-3.5 rounded-2xl bg-primary-sora text-white text-sm font-bold hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shadow-primary-sora/20 disabled:opacity-75 disabled:cursor-not-allowed group"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isUpdating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                />
                <span>{isUpdating ? 'Actualizando aplicación...' : 'Actualizar Aplicación Ahora'}</span>
              </button>

              <button
                onClick={handleDismissPopup}
                disabled={isUpdating}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-semibold text-text-sora/70 hover:text-text-sora hover:bg-border-sora/40 transition-colors disabled:opacity-50"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BANNER SUPERIOR INFORMATIVO / RECORDATORIO             */}
      {/* ========================================================= */}
      {isBannerVisible && (
        <div className="bg-gradient-to-r from-primary-sora/15 via-bg-sora to-amber-500/10 border-b border-primary-sora/25 px-4 py-2.5 sm:px-6 transition-all animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center space-x-2.5">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-sora text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <div className="text-xs text-text-sora">
                <span className="font-bold text-primary-sora mr-1.5 uppercase tracking-wider text-[11px] bg-primary-sora/10 px-2 py-0.5 rounded-full border border-primary-sora/20">
                  Actualización v{serverVersion || CURRENT_APP_VERSION}
                </span>
                <span className="font-medium">
                  Pedidos en tiempo real con WebSockets y link público de rastreo en vivo para clientes por WhatsApp.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
              <button
                onClick={handleUpdateNow}
                disabled={isUpdating}
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-primary-sora text-white hover:bg-primary-hover px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:text-primary-hover px-2 py-1.5 rounded-xl hover:bg-primary-sora/10 transition-colors"
              >
                <span>Novedades</span>
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

      {/* ========================================================= */}
      {/* 3. BOTÓN FLOTANTE DISCRETO PARA REVISAR ACTUALIZACIONES   */}
      {/* ========================================================= */}
      <button
        onClick={() => setShowPopup(true)}
        className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md text-text-sora border border-border-sora shadow-lg hover:shadow-xl rounded-full px-3.5 py-2 flex items-center space-x-2 text-xs font-semibold hover:border-primary-sora/40 transition-all hover:scale-105 active:scale-95 group"
        title="Centro de Actualizaciones y Novedades"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-sora opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-sora" />
        </span>
        <span className="group-hover:text-primary-sora transition-colors">
          v{serverVersion || CURRENT_APP_VERSION} • Actualizar
        </span>
      </button>

      {/* ========================================================= */}
      {/* 4. MODAL DETALLADO CON HOJA DE RUTA Y NOVEDADES           */}
      {/* ========================================================= */}
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
                    Novedades de la Versión v{serverVersion || CURRENT_APP_VERSION}
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
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Versión Actual (v{serverVersion || CURRENT_APP_VERSION})
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
                Sora Web App • Build v{serverVersion || CURRENT_APP_VERSION}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUpdateNow}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>{isUpdating ? 'Actualizando...' : 'Actualizar ahora'}</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border-sora text-text-sora/70 hover:bg-border-sora/30 text-xs font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
