export const CURRENT_APP_VERSION = '1.2.3';
export const CURRENT_RELEASE_TITLE = 'Sora v1.2.3 • Seguimiento GPS en Vivo & Retiro en Local';
export const CURRENT_RELEASE_DATE = '2026-10-21';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '📍',
    title: 'Seguimiento del Repartidor en Vivo (GPS)',
    description: 'El cliente ve en tiempo real en el mapa dónde viene su motorista, los kilómetros restantes y el tiempo estimado de llegada para mayor tranquilidad.',
  },
  {
    icon: '🏪',
    title: 'Modalidad de Retiro en el Local (Takeout)',
    description: 'En ventas ahora puedes elegir "Retiro en Local", sin costo de envío (RD$ 0) y con indicaciones guiadas en Google Maps para el cliente.',
  },
  {
    icon: '⚡',
    title: 'Sincronización en Tiempo Real (WebSockets)',
    description: 'Los pedidos y estados se actualizan automáticamente en Cocina, Delivery y Dashboard sin refrescar la pantalla.',
  },
  {
    icon: '🛵',
    title: 'Link Público de Rastreo para WhatsApp',
    description: 'Enlace exclusivo sin necesidad de login para que el cliente siga paso a paso su comida y contacte a la cocina.',
  },
];

/**
 * Limpia todas las memorias caché locales del navegador (Service Workers y CacheStorage)
 * y fuerza un refresco limpio de la aplicación a la nueva versión.
 */
export async function applyAppUpdate(targetVersion: string = CURRENT_APP_VERSION): Promise<void> {
  try {
    // 1. Guardar la versión actualizada en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sora_installed_version', targetVersion);
      localStorage.setItem('sora_update_dismissed_version', targetVersion);
    }

    // 2. Limpiar Cache Storage del navegador (evita chunks JS viejos de Vercel)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      } catch (cacheErr) {
        console.warn('No se pudo vaciar CacheStorage:', cacheErr);
      }
    }

    // 3. Desregistrar o actualizar Service Workers si están presentes
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      } catch (swErr) {
        console.warn('No se pudo desregistrar el Service Worker:', swErr);
      }
    }
  } catch (error) {
    console.error('Error durante la preparación de la actualización:', error);
  } finally {
    // 4. Forzar recarga completa evitando caché HTTP del navegador
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.replace(url.toString());
    }
  }
}
