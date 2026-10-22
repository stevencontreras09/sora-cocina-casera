export const CURRENT_APP_VERSION = '1.2.4';
export const CURRENT_RELEASE_TITLE = 'Sora v1.2.4 • Desglose Detallado de Envío, Fix iPad & Logo Oficial';
export const CURRENT_RELEASE_DATE = '2026-10-21';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '🧾',
    title: 'Desglose Transparente de Envío al Cliente',
    description: 'En el enlace de rastreo compartido por WhatsApp, el cliente ve con exactitud el Subtotal de la comida, el Costo de Delivery a domicilio y el Total final.',
  },
  {
    icon: '📱',
    title: 'Optimización Visual en iPad y Tablets',
    description: 'Corregida la distorsión del formulario de egresos en iPad (evitando solapamientos entre el selector de fecha y la categoría).',
  },
  {
    icon: '🎨',
    title: 'Logo Oficial de Sora Integrado',
    description: 'Se incorporó el logo oficial circular en el ícono de inicio PWA, pantalla de login, barra de navegación y página de rastreo.',
  },
  {
    icon: '📍',
    title: 'Seguimiento del Repartidor en Vivo (GPS)',
    description: 'Visualización en vivo de la trayectoria del motorista y tiempo estimado para clientes y equipo.',
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
