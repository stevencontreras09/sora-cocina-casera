'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Check,
  Share,
  PlusSquare,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallAppModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está en modo Standalone (PWA ya instalada)
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // 2. Detectar si es iOS (iPhone / iPad / iPod)
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice =
        /iphone|ipad|ipod/.test(userAgent) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      setIsIOS(isAppleDevice);

      // 3. Escuchar el evento nativo beforeinstallprompt (Android / Chrome / Edge / Windows / Mac)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
          setInstallSuccess(false);
        }, 2500);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('Instalación cancelada o no completada:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full border border-border-sora shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Cabecera */}
        <div className="p-6 bg-gradient-to-br from-primary-sora/15 via-bg-sora to-amber-500/10 border-b border-border-sora relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-primary-sora/25 border border-primary-sora/20 bg-white flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Sora Cocina Casera" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-sora text-white shadow-xs">
                App Web Progresiva (PWA)
              </span>
              <p className="text-xs text-text-sora/60 font-semibold mt-0.5">
                Sora Cocina Casera
              </p>
            </div>
          </div>

          <h2 className="font-serif font-bold text-xl sm:text-2xl text-text-sora leading-tight">
            Instalar Sora en este Dispositivo
          </h2>
          <p className="text-xs text-text-sora/75 mt-1 leading-relaxed">
            Ten acceso instantáneo a tus pedidos, ventas y entregas en pantalla completa, como una app nativa en tu teléfono o computadora.
          </p>
        </div>

        {/* Contenido según el dispositivo */}
        <div className="p-6 space-y-4">
          {isStandalone ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-bold text-sm text-emerald-950">
                ¡Sora ya está instalada!
              </h4>
              <p className="text-xs text-emerald-800/80">
                Ya estás disfrutando de Sora en modo app nativa sin barras de navegación.
              </p>
            </div>
          ) : isIOS ? (
            /* GUÍA VISUAL PASO A PASO PARA IPHONE / IPAD (SAFARI) */
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-primary-sora uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Instalación en iPhone / iPad (iOS)</span>
              </div>

              <div className="space-y-2.5">
                {/* Paso 1 */}
                <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-xl bg-primary-sora text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-text-sora flex items-center">
                      Presiona el botón Compartir
                      <Share className="w-4 h-4 ml-1.5 text-blue-600 inline" />
                    </p>
                    <p className="text-text-sora/65 text-[11px] mt-0.5">
                      En la barra inferior de Safari (o en la barra superior si usas un iPad).
                    </p>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-xl bg-primary-sora text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-text-sora flex items-center">
                      Elige &ldquo;Agregar a Inicio&rdquo;
                      <PlusSquare className="w-4 h-4 ml-1.5 text-text-sora inline" />
                    </p>
                    <p className="text-text-sora/65 text-[11px] mt-0.5">
                      Desliza hacia abajo en las opciones del menú y selecciona <strong>Agregar a pantalla de inicio</strong>.
                    </p>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="p-3.5 rounded-2xl bg-bg-sora/80 border border-border-sora flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-text-sora">
                      Confirma tocando &ldquo;Agregar&rdquo;
                    </p>
                    <p className="text-text-sora/65 text-[11px] mt-0.5">
                      En la esquina superior derecha. ¡Listo! El icono de Sora aparecerá en tu pantalla.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* GUÍA DIRECTA PARA ANDROID / WINDOWS / MAC / CHROME / EDGE */
            <div className="space-y-3.5">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-text-sora/80">
                  <Sparkles className="w-4 h-4 text-primary-sora" />
                  <span className="font-semibold">Sin descargas pesadas de tienda (Google Play / App Store).</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-text-sora/80">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Compatible con PC, Mac, tablets y celulares Android.</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-text-sora/80">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Funciona en pantalla completa con máxima velocidad.</span>
                </div>
              </div>

              {installSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-center space-y-1 animate-in fade-in">
                  <p className="font-bold text-sm">🎉 ¡Instalación exitosa!</p>
                  <p className="text-xs text-emerald-800">
                    Sora se ha agregado a tus aplicaciones.
                  </p>
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 rounded-2xl bg-primary-sora text-white text-sm font-bold hover:bg-primary-hover active:scale-98 transition-all shadow-md shadow-primary-sora/25 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Instalando aplicación...' : 'Instalar Aplicación Ahora'}</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-bg-sora border border-border-sora text-xs text-text-sora/80 space-y-1 text-center">
                  <p className="font-bold">Para instalar desde tu navegador actual:</p>
                  <p className="text-[11px] text-text-sora/60">
                    Haz clic en el icono de <strong>Instalar</strong> en la barra de direcciones de tu navegador (Chrome / Edge) o en el menú de 3 puntos ➔ <strong>&ldquo;Instalar Sora Cocina Casera&rdquo;</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 bg-bg-sora/30 border-t border-border-sora flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border-sora text-text-sora/70 hover:bg-border-sora/30 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
