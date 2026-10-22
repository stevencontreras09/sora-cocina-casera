export const CURRENT_APP_VERSION = '1.3.0';
export const CURRENT_RELEASE_TITLE = 'Sora v1.3.0 • Vista Nocturna Inteligente (Modo Oscuro/Claro/Sistema) & Historial de Actualizaciones';
export const CURRENT_RELEASE_DATE = '2026-10-22';

export interface VersionHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface ReleaseChangelog {
  version: string;
  title: string;
  date: string;
  badge?: string;
  highlights: VersionHighlight[];
}

export const CURRENT_RELEASE_HIGHLIGHTS: VersionHighlight[] = [
  {
    icon: '🌙',
    title: 'Vista Nocturna Inteligente (Dark Mode)',
    description: 'Detección automática de la preferencia del sistema operativo y selector manual entre Modo Claro, Modo Oscuro y Automático.',
  },
  {
    icon: '🎨',
    title: 'Selector de Tema Visual Integrado',
    description: 'Control visual segmentado en el menú lateral y botón rápido en la barra superior para cambiar de tema al instante y sin recargar.',
  },
  {
    icon: '📋',
    title: 'Historial Completo de Actualizaciones (v1.2 a v1.3)',
    description: 'Ventana interactiva para consultar cada una de las mejoras, herramientas y funciones implementadas en Sora desde la versión 1.2.',
  },
  {
    icon: '🎄',
    title: 'Menú Navideño Oficial Integrado',
    description: '26 platos con todas las presentaciones: Lasañas, Pastelones de Papa, Berenjena y Plátano Maduro de 1 lb, 2 lb y Bandejas de 4, 8, 12 y 24.',
  },
  {
    icon: '⚡',
    title: 'Autocompletado Dinámico de Clientes',
    description: 'Búsqueda interactiva en un solo paso con sugerencias en vivo, selección rápida y botón para registrar clientes nuevos al vuelo.',
  },
  {
    icon: '🧹',
    title: 'Limpieza Diaria & Pestañas de Cocina',
    description: 'Separación en Cocina Activa, Entregados Hoy y Archivo Histórico con botón para despejar pantalla sin perder ningún dato contable.',
  },
];

export const HISTORICAL_RELEASES: ReleaseChangelog[] = [
  {
    version: '1.3.0',
    title: 'Vista Nocturna Inteligente & Historial de Versiones',
    date: '2026-10-22',
    badge: 'Versión Actual',
    highlights: [
      {
        icon: '🌙',
        title: 'Vista Nocturna con Detección Automática',
        description: 'Se adapta de forma inteligente al tema oscuro de tu dispositivo (Windows, Mac, Android o iPhone) o permite alternar manualmente entre Claro, Oscuro y Sistema.',
      },
      {
        icon: '🎨',
        title: 'Selector Rápido de Tema',
        description: 'Ubicado en la barra de navegación lateral y móvil para cambiar el estilo visual en cualquier momento con cero parpadeo.',
      },
      {
        icon: '📜',
        title: 'Línea de Tiempo de Novedades',
        description: 'Acceso directo a todo el historial cronológico de actualizaciones desde la versión 1.2 hasta la actualidad.',
      },
    ],
  },
  {
    version: '1.2.8',
    title: 'Menú Navideño Oficial & Carga de Ventas Históricas',
    date: '2026-10-22',
    highlights: [
      {
        icon: '🎄',
        title: 'Catálogo de Menú Navideño (26 Platos)',
        description: 'Incorporación de todas las bandejas (4, 8, 12 y 24 raciones) de Lasañas, Pastelón de Papa, Berenjena, Plátano Maduro y Pasteles en Hoja.',
      },
      {
        icon: '🥔',
        title: 'Insumos de Pastelones en Inventario',
        description: 'Papas, berenjenas, plátanos maduros, masa de pasteles, hojas y bandejas de aluminio integrados para escandallo de costos.',
      },
      {
        icon: '📈',
        title: 'Ventas Anteriores en Reportes',
        description: '42 comandas del cuaderno de recordatorios migradas a la base de datos totalizando RD$ 24,350 en Octubre.',
      },
    ],
  },
  {
    version: '1.2.7',
    title: 'Autocompletado de Clientes, Limpieza de Comandas & Módulo Platos',
    date: '2026-10-22',
    highlights: [
      {
        icon: '⚡',
        title: 'Combobox Interactivo de Clientes',
        description: 'Búsqueda instantánea por nombre o teléfono con alta rápida sin salir de la comanda y eliminación de "Pegar WhatsApp".',
      },
      {
        icon: '🧹',
        title: 'Pestañas de Historial & Limpieza Diaria',
        description: 'Separación en Cocina Activa, Entregados Hoy y Archivo Histórico con botón "Limpiar Pantalla" sin borrar la base de datos.',
      },
      {
        icon: '🍲',
        title: 'Módulo de Platos & Recetas (/platos)',
        description: 'Gestión de precios, ingredientes (BOM), cálculo en vivo de Food Cost y descuento automático del inventario.',
      },
      {
        icon: '📱',
        title: 'Logo Oficial PWA en Escritorio y Teléfono',
        description: 'Generación de favicon.ico nativo de Windows y soporte maskable en Android/iOS con el logo circular de Sora.',
      },
    ],
  },
  {
    version: '1.2.6',
    title: 'Importador Masivo WhatsApp/VCF & Reposición de Stock',
    date: '2026-10-22',
    highlights: [
      {
        icon: '📲',
        title: 'Importador Masivo WhatsApp & VCF',
        description: 'Pega listas de pedidos, mensajes de chat o sube archivos .vcf para crear clientes y direcciones automáticamente con deduplicación.',
      },
      {
        icon: '🏪',
        title: 'Segmentación Pickup vs Domicilio',
        description: 'Filtros rápidos (Todos, A Domicilio, Retiro en Local) con insignias visuales distintivas en el directorio de clientes.',
      },
      {
        icon: '🛒',
        title: 'Reposición Directa de Stock',
        description: 'Botón "Comprar" en artículos con stock bajo que actualiza existencias y registra el gasto contable en un solo paso.',
      },
      {
        icon: '🔔',
        title: 'Alerta Sonora Realtime en Dashboard',
        description: 'Campana auditiva en tiempo real al recibirse cualquier pedido nuevo sin tocar la pantalla.',
      },
    ],
  },
  {
    version: '1.2.5',
    title: 'Módulo de Inventario, Unidades en Gastos & Semáforo de Tiempo',
    date: '2026-10-21',
    highlights: [
      {
        icon: '📦',
        title: 'Módulo Completo de Inventario (/inventario)',
        description: 'Control de existencias de insumos y empaques, alertas de reorden de stock bajo y valorización en RD$.',
      },
      {
        icon: '⚖️',
        title: 'Libras y Unidades en Gastos',
        description: 'Registro de egresos con cantidad, unidad (lb, kg, ud, paq, L) y opción de sumar directo al almacén.',
      },
      {
        icon: '🚨',
        title: 'Semáforo de Tiempo y Parpadeo Urgente',
        description: 'Cálculo de minutos restantes con parpadeo rojo intermitente en comandas atrasadas o próximas a salir.',
      },
      {
        icon: '⏰',
        title: 'Alertas Horarias & Resumen Matutino',
        description: 'Avisos de cocina programables y tarjeta matutina para planificar el horneado del día.',
      },
    ],
  },
  {
    version: '1.2.4',
    title: 'Desglose de Tarifas en Rastreo & Adaptabilidad en iPad',
    date: '2026-10-21',
    highlights: [
      {
        icon: '🧾',
        title: 'Desglose Transparente de Envío',
        description: 'En el enlace de rastreo compartido al cliente se desglosa el subtotal de platos, costo de envío y total a pagar.',
      },
      {
        icon: '📱',
        title: 'Ajuste Visual Responsive para iPad',
        description: 'Corrección de solapamiento de cuadrícula en tablets en el módulo de Gastos.',
      },
    ],
  },
  {
    version: '1.2.3',
    title: 'Rastreo del Repartidor en Vivo & Modalidad Retiro en Local',
    date: '2026-10-21',
    highlights: [
      {
        icon: '🛵',
        title: 'Rastreo del Repartidor en Vivo',
        description: 'Seguimiento por GPS en tiempo real para que el cliente vea la ubicación del motorista camino a su entrega.',
      },
      {
        icon: '🏪',
        title: 'Modalidad de Retiro en Local',
        description: 'Opción para facturar sin costo de envío ni requerir repartidor para clientes de mostrador.',
      },
    ],
  },
  {
    version: '1.2.0',
    title: 'Roles, Permisos Granulares & Enrutador Inteligente',
    date: '2026-10-20',
    highlights: [
      {
        icon: '🛡️',
        title: 'Roles de Acceso Granulares',
        description: 'Separación de vistas y permisos para Administrador, Co-administrador y Repartidores.',
      },
      {
        icon: '🗺️',
        title: 'Cálculo de Distancia & Tarifa Dinámica',
        description: 'Estimación automática de tarifas de delivery basada en kilómetros desde la cocina central de Sora.',
      },
    ],
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
