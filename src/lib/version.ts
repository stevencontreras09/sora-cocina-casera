export const CURRENT_APP_VERSION = '1.2.7';
export const CURRENT_RELEASE_TITLE = 'Sora v1.2.7 • Autocompletado Dinámico de Clientes, Limpieza de Comandas, Módulo Platos & Recetas y Logo PWA';
export const CURRENT_RELEASE_DATE = '2026-10-22';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '⚡',
    title: 'Autocompletado Dinámico de Clientes',
    description: 'Búsqueda interactiva en un solo paso con sugerencias en tiempo real, selección instantánea y botón para registrar clientes nuevos al vuelo.',
  },
  {
    icon: '🧹',
    title: 'Limpieza Diaria & Pestañas de Historial',
    description: 'Separación organizada en Cocina Activa, Entregados Hoy y Archivo Histórico con botón para limpiar pantalla sin borrar ningún registro.',
  },
  {
    icon: '🍲',
    title: 'Módulo de Platos & Escandallo de Recetas',
    description: 'Gestión de platos a la venta con receta de insumos, cálculo automático de costo de producción (Food Cost), margen de ganancia y descuento de inventario.',
  },
  {
    icon: '🎨',
    title: 'Logo Oficial de Sora en Escritorio y Celular',
    description: 'Icono nativo favicon.ico y soporte maskable en PWA para que el logo de Sora se vea nítido al instalar la app en Windows, Mac, Android y iPhone.',
  },
  {
    icon: '💬',
    title: 'Recordatorio WhatsApp Adaptativo',
    description: 'Recuadro de recordatorios de pedidos futuros totalmente integrado dentro de la comanda para una visualización impecable sin desbordamientos.',
  },
  {
    icon: '📦',
    title: 'Descuento Automático de Inventario',
    description: 'Descuento opcional y automático de carnes, salsas, quesos y pastas del almacén al crear un pedido o marcarlo como entregado.',
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
