'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Chequear si hay actualización de PWA
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('Nuevo contenido PWA disponible. Recargando en próximo uso.');
                  } else {
                    console.log('Contenido PWA cacheado para uso offline.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Registro de Service Worker falló:', err);
        });
    }
  }, []);

  return null;
}
