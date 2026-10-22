export const CURRENT_APP_VERSION = '1.2.6';
export const CURRENT_RELEASE_TITLE = 'Sora v1.2.6 • Importador Masivo WhatsApp/VCF, Segmentación Pickup & Reposición Directa de Stock';
export const CURRENT_RELEASE_DATE = '2026-10-22';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '📲',
    title: 'Importador Masivo de WhatsApp & VCF',
    description: 'Pega listas de pedidos, mensajes de chat o sube archivos .vcf para crear clientes y direcciones automáticamente con detección de duplicados.',
  },
  {
    icon: '🏪',
    title: 'Segmentación de Clientes Pickup vs Domicilio',
    description: 'Filtra en un toque entre clientes de mostrador y pedidos con entrega a domicilio, con insignias visuales distintivas.',
  },
  {
    icon: '🛒',
    title: 'Reposición Directa de Stock desde Inventario',
    description: 'Botón "Comprar" en artículos con stock bajo que actualiza existencias y registra el gasto contable en un solo paso.',
  },
  {
    icon: '🔔',
    title: 'Alerta Sonora Realtime en el Dashboard',
    description: 'El timbre de cocina suena al instante en el Dashboard en cuanto se crea una orden en el mostrador.',
  },
  {
    icon: '🖨️',
    title: 'Impresión y Auditoría de Cocina',
    description: 'Exporta o imprime el listado de existencias con formato limpio para auditorías y cuadre físico de despensa.',
  },
  {
    icon: '🚨',
    title: 'Semáforo de Urgencia & Alertas de Producción',
    description: 'Parpadeo intermitente en comandas próximas a vencer y recordatorios matutinos de pedidos agendados.',
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
