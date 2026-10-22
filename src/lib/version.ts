export const CURRENT_APP_VERSION = '1.2.5';
export const CURRENT_RELEASE_TITLE = 'Sora v1.2.5 • Semáforo de Pedidos, Extractor WhatsApp, Inventario & Libras en Gastos';
export const CURRENT_RELEASE_DATE = '2026-10-22';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '🚨',
    title: 'Semáforo y Alerta Visual de Pedidos',
    description: 'Los pedidos próximos a su hora o demorados parpadean con alerta roja y naranja para que ningún pedido se quede sin despachar.',
  },
  {
    icon: '✨',
    title: 'Extractor Inteligente de WhatsApp & Modo Pickup',
    description: 'Pega el texto del cliente de WhatsApp y extrae nombre, teléfono y dirección al instante. Soporte para pedidos de solo retiro en el local.',
  },
  {
    icon: '📦',
    title: 'Módulo Completo de Inventario',
    description: 'Gestión en tiempo real de insumos y empaques con alertas de stock bajo, reorden y valorización económica del almacén.',
  },
  {
    icon: '⚖️',
    title: 'Cantidades y Libras en Gastos con Suma al Stock',
    description: 'Registra compras por libras o paquetes y cárgalas automáticamente a las existencias del inventario de cocina.',
  },
  {
    icon: '⏰',
    title: 'Avisos de Producción & Recordatorio por WhatsApp',
    description: 'Avisos matutinos de pedidos agendados, selector de horas de anticipación y plantilla con 1 clic para recordar pedidos futuros al cliente.',
  },
  {
    icon: '🍲',
    title: 'Auto-guardado de Platos Nuevos en Catálogo',
    description: 'Cualquier plato nuevo agregado al crear un pedido se guarda automáticamente en la base de datos para futuros despachos.',
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
