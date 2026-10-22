'use client';

import { Order, Client, ClientAddress, Expense, Profile, MenuItem, InventoryItem, InventoryUnit } from '@/types/database.types';

// Comprobación de formato UUID estándar de Postgres
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Generador de UUID universal seguro (usa crypto.randomUUID en navegadores modernos)
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Disparador de eventos de guardado automático
export function notifyAutoSave(section: string) {
  if (typeof window === 'undefined') return;
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem('sora_last_autosave_time', timestamp);
    localStorage.setItem('sora_last_autosave_section', section);
    window.dispatchEvent(
      new CustomEvent('sora-autosave-event', {
        detail: { section, timestamp },
      })
    );
  } catch (e) {
    console.warn('Error al registrar autosave local:', e);
  }
}

// ==================== PEDIDOS (ORDERS) ====================
const ORDERS_STORAGE_KEY = 'sora_orders_cache_v2';

export function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredOrders(orders: Order[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    notifyAutoSave('Ventas / Pedidos');
  } catch (e) {
    console.warn('Error al guardar pedidos localmente:', e);
  }
}

// ==================== DIRECCIONES (CLIENT ADDRESSES) ====================
const ADDRESSES_STORAGE_KEY = 'sora_client_addresses_cache_v2';

export function getStoredAddresses(): ClientAddress[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADDRESSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredAddresses(addresses: ClientAddress[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
  } catch (e) {
    console.warn('Error al guardar direcciones localmente:', e);
  }
}

// ==================== CLIENTES (CLIENTS) ====================
const CLIENTS_STORAGE_KEY = 'sora_clients_cache_v2';

export function getStoredClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    const clients: Client[] = raw ? JSON.parse(raw) : [];
    
    // Asegurar que cada cliente mantenga todas sus direcciones sincronizadas con el almacén dedicado
    const allAddresses = getStoredAddresses();
    if (allAddresses.length > 0) {
      return clients.map((c) => {
        const clientAddrs = allAddresses.filter((a) => a.client_id === c.id);
        const existing = c.addresses || [];
        const merged = [...existing];
        clientAddrs.forEach((ca) => {
          if (
            !merged.some(
              (ea) =>
                ea.id === ca.id ||
                (ea.address.trim().toLowerCase() === ca.address.trim().toLowerCase() &&
                  ea.label === ca.label)
            )
          ) {
            merged.push(ca);
          }
        });
        return { ...c, addresses: merged };
      });
    }

    return clients;
  } catch (e) {
    return [];
  }
}

export function saveStoredClients(clients: Client[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));

    // Consolidar y resguardar permanentemente todas las direcciones en almacenamiento dedicado
    const allCurrentAddresses: ClientAddress[] = [];
    clients.forEach((c) => {
      (c.addresses || []).forEach((a) => {
        if (a && a.id) allCurrentAddresses.push(a);
      });
    });
    saveStoredAddresses(allCurrentAddresses);

    notifyAutoSave('Clientes y Direcciones');
  } catch (e) {
    console.warn('Error al guardar clientes localmente:', e);
  }
}

/**
 * Función centralizada que fusiona clientes y direcciones garantizando CERO pérdidas:
 * - Preserva 100% de las direcciones locales aunque Supabase no las tenga o esté vacío.
 * - Desduplica inteligentemente por ID o por (dirección textual + etiqueta).
 */
export function mergeClientsWithCached(
  incomingClients: Client[] = [],
  incomingAddresses: ClientAddress[] = []
): Client[] {
  const cachedClients = getStoredClients();
  const cachedAddresses = getStoredAddresses();

  // Mapa de todas las direcciones conocidas
  const allAddressesMap = new Map<string, ClientAddress>();
  cachedAddresses.forEach((a) => {
    if (a?.id) allAddressesMap.set(a.id, a);
  });
  incomingAddresses.forEach((a) => {
    if (a?.id) allAddressesMap.set(a.id, a);
  });

  // Mapa de clientes
  const clientsMap = new Map<string, Client>();

  // 1. Cargar lo que ya estaba en caché
  cachedClients.forEach((c) => {
    if (c?.id) {
      clientsMap.set(c.id, {
        ...c,
        addresses: [...(c.addresses || [])],
      });
    }
  });

  // 2. Fusionar con clientes entrantes (de Supabase o de formulario)
  incomingClients.forEach((inc) => {
    if (!inc?.id) return;
    const existing = clientsMap.get(inc.id);
    if (existing) {
      const combinedAddresses = [...(existing.addresses || [])];
      (inc.addresses || []).forEach((ia) => {
        if (
          !combinedAddresses.some(
            (ca) =>
              ca.id === ia.id ||
              ca.address.trim().toLowerCase() === ia.address.trim().toLowerCase()
          )
        ) {
          combinedAddresses.push(ia);
        }
      });

      clientsMap.set(inc.id, {
        ...existing,
        ...inc,
        addresses: combinedAddresses,
      });
    } else {
      clientsMap.set(inc.id, {
        ...inc,
        addresses: inc.addresses ? [...inc.addresses] : [],
      });
    }
  });

  // 3. Vincular cualquier dirección huérfana de la lista global de direcciones a su cliente
  allAddressesMap.forEach((addr) => {
    if (!addr.client_id) return;
    const client = clientsMap.get(addr.client_id);
    if (client) {
      const addrs = client.addresses || [];
      if (
        !addrs.some(
          (a) =>
            a.id === addr.id ||
            (a.address.trim().toLowerCase() === addr.address.trim().toLowerCase() &&
              a.label === addr.label)
        )
      ) {
        addrs.push(addr);
        client.addresses = addrs;
      }
    }
  });

  const mergedList = Array.from(clientsMap.values());
  saveStoredClients(mergedList);
  return mergedList;
}

// ==================== GASTOS (EXPENSES) ====================
const EXPENSES_STORAGE_KEY = 'sora_expenses_cache_v2';

export function getStoredExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredExpenses(expenses: Expense[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
    notifyAutoSave('Control de Gastos');
  } catch (e) {
    console.warn('Error al guardar gastos localmente:', e);
  }
}

// ==================== USUARIOS Y PERMISOS (PROFILES) ====================
const USERS_STORAGE_KEY = 'sora_users_cache_v2';

export function getStoredUsers(): Profile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredUsers(users: Profile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    // También guardar permisos individuales para búsqueda rápida por ID o email
    users.forEach((u) => {
      if (u.id && u.permissions) {
        const cleanId = u.id.toLowerCase().trim();
        const jsonPerms = JSON.stringify(u.permissions);
        localStorage.setItem(`sora_perms_${cleanId}`, jsonPerms);
        localStorage.setItem(`sora_perms_${u.id}`, jsonPerms);
        try {
          document.cookie = `sora_perms_${cleanId}=${encodeURIComponent(jsonPerms)}; path=/; max-age=2592000; SameSite=Lax`;
          document.cookie = `sora_perms_${u.id}=${encodeURIComponent(jsonPerms)}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (_) {}
      }
      if (u.email && u.permissions) {
        const cleanEmail = u.email.toLowerCase().trim();
        const jsonPerms = JSON.stringify(u.permissions);
        localStorage.setItem(`sora_perms_${cleanEmail}`, jsonPerms);
        try {
          document.cookie = `sora_perms_${cleanEmail}=${encodeURIComponent(jsonPerms)}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (_) {}
      }
    });
    notifyAutoSave('Usuarios y Permisos');
  } catch (e) {
    console.warn('Error al guardar usuarios localmente:', e);
  }
}

export function getStoredUserPermissions(userIdOrEmail: string): string[] | null {
  if (typeof window === 'undefined' || !userIdOrEmail) return null;
  try {
    const cleanKey = `sora_perms_${userIdOrEmail.toLowerCase().trim()}`;
    const raw = localStorage.getItem(cleanKey) || localStorage.getItem(`sora_perms_${userIdOrEmail}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ==================== CONFIGURACIÓN DE LA TIENDA / LOCAL ====================
export interface StoreLocation {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  googleMapsUrl?: string;
}

export const OFFICIAL_SORA_LOCATION: StoreLocation = {
  name: 'Sora Cocina Casera',
  latitude: 18.4406576,
  longitude: -69.9572904,
  address: 'Santo Domingo, Distrito Nacional, República Dominicana',
  googleMapsUrl:
    'https://www.google.com/maps/place/Casa/@18.4404123,-69.9575135,20.25z/data=!4m6!3m5!1s0x8ea561007304889f:0xb9713c73066b51b9!8m2!3d18.4406576!4d-69.9572904!16s%2Fg%2F11ldxtwy9s',
};

const STORE_LOCATION_KEY = 'sora_store_location_v2';

export function getStoredStoreLocation(): StoreLocation {
  if (typeof window === 'undefined') return OFFICIAL_SORA_LOCATION;
  try {
    const raw = localStorage.getItem(STORE_LOCATION_KEY);
    return raw ? JSON.parse(raw) : OFFICIAL_SORA_LOCATION;
  } catch (e) {
    return OFFICIAL_SORA_LOCATION;
  }
}

export function saveStoredStoreLocation(location: StoreLocation) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_LOCATION_KEY, JSON.stringify(location));
    notifyAutoSave('Ubicación del Local');
  } catch (e) {
    console.warn('Error al guardar ubicación del local:', e);
  }
}

// ==================== PLATOS DEL MENÚ (MENU ITEMS) ====================
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'lasana-individual',
    name: 'Lasaña Casera (Porción Individual)',
    price: 350,
    description: 'Lasaña artesanal horneada individual',
    category: 'Lasañas',
    is_available: true,
  },
  {
    id: 'lasana-familiar',
    name: 'Lasaña Casera (Familiar / Grande)',
    price: 700,
    description: 'Lasaña artesanal horneada tamaño familiar',
    category: 'Lasañas',
    is_available: true,
  },
];

const MENU_STORAGE_KEY = 'sora_menu_items_v2';

export function getStoredMenuItems(): MenuItem[] {
  if (typeof window === 'undefined') return DEFAULT_MENU_ITEMS;
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return DEFAULT_MENU_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MENU_ITEMS;
  } catch (e) {
    return DEFAULT_MENU_ITEMS;
  }
}

export function saveStoredMenuItems(items: MenuItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items));
    notifyAutoSave('Menú de Platos');
  } catch (e) {
    console.warn('Error al guardar platos del menú localmente:', e);
  }
}

// ==================== INVENTARIO DE INSUMOS & EMPAQUES ====================
export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-queso-mozzarella',
    name: 'Queso Mozzarella Rallado',
    unit: 'lb',
    current_stock: 35.0,
    min_alert_stock: 10.0,
    cost_per_unit: 195,
    category: 'insumos',
    notes: 'Insumo principal para lasañas',
  },
  {
    id: 'inv-carne-molida',
    name: 'Carne Molida de Res Seleccionada',
    unit: 'lb',
    current_stock: 28.5,
    min_alert_stock: 8.0,
    cost_per_unit: 210,
    category: 'insumos',
    notes: 'Para salsa boloñesa casera',
  },
  {
    id: 'inv-pasta-lasana',
    name: 'Pasta para Lasaña (Laminada)',
    unit: 'paq',
    current_stock: 24,
    min_alert_stock: 6,
    cost_per_unit: 120,
    category: 'insumos',
    notes: 'Cajas de pasta precocida',
  },
  {
    id: 'inv-salsa-bechamel',
    name: 'Salsa Bechamel Artesanal',
    unit: 'L',
    current_stock: 12.0,
    min_alert_stock: 3.0,
    cost_per_unit: 160,
    category: 'insumos',
    notes: 'Preparación diaria',
  },
  {
    id: 'inv-envases-individuales',
    name: 'Envases Térmicos Individuales',
    unit: 'ud',
    current_stock: 65,
    min_alert_stock: 20,
    cost_per_unit: 18,
    category: 'empaques',
    notes: 'Con tapa hermética',
  },
  {
    id: 'inv-envases-familiares',
    name: 'Bandejas Térmicas Familiares',
    unit: 'ud',
    current_stock: 30,
    min_alert_stock: 10,
    cost_per_unit: 45,
    category: 'empaques',
    notes: 'Para porciones grandes',
  },
  {
    id: 'inv-bolsas-kraft',
    name: 'Bolsas Kraft con Sello Sora',
    unit: 'ud',
    current_stock: 80,
    min_alert_stock: 25,
    cost_per_unit: 12,
    category: 'empaques',
    notes: 'Bolsas para despacho y pickup',
  },
];

const INVENTORY_STORAGE_KEY = 'sora_inventory_items_v1';

export function getStoredInventory(): InventoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_INVENTORY_ITEMS;
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return DEFAULT_INVENTORY_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INVENTORY_ITEMS;
  } catch (e) {
    return DEFAULT_INVENTORY_ITEMS;
  }
}

export function saveStoredInventory(items: InventoryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
    notifyAutoSave('Inventario de Cocina');
  } catch (e) {
    console.warn('Error al guardar inventario localmente:', e);
  }
}

// ==================== EXTRACTOR INTELIGENTE DE WHATSAPP ====================
export interface ExtractedWhatsAppClient {
  name: string;
  phone: string;
  address: string;
  reference: string;
  notes: string;
  isPickup: boolean;
}

export function extractWhatsAppMessage(rawText: string): ExtractedWhatsAppClient {
  if (!rawText) {
    return { name: '', phone: '', address: '', reference: '', notes: '', isPickup: false };
  }

  const text = rawText.trim();
  let name = '';
  let phone = '';
  let address = '';
  let reference = '';
  let notes = '';
  let isPickup = false;

  // 1. Detectar si el cliente menciona Pickup / Retiro
  if (/retiro|pickup|paso a buscar|recojo|pasar a recoger|en el local/i.test(text)) {
    isPickup = true;
  }

  // 2. Extraer teléfono (soporta 809, 829, 849 con o sin +1, guiones, espacios o paréntesis)
  const phoneRegex = /(?:\+?1\s?)?(?:\(?([8][0,2,4][9])\)?[-.\s]?)(\d{3})[-.\s]?(\d{4})/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    phone = `+1${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`;
  } else {
    const digitsOnly = text.match(/\b(8[024]9\d{7})\b/);
    if (digitsOnly) {
      phone = `+1${digitsOnly[1]}`;
    }
  }

  // 3. Dividir por líneas para buscar patrones
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Buscar nombre
    if (!name) {
      const nameMatch = line.match(/(?:nombre|cliente|soy|de parte de)\s*[:=-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,35})/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }
    }

    // Buscar dirección
    if (!address) {
      const addrMatch = line.match(/(?:direcci[oó]n|ubicaci[oó]n|env[ií]o|para llevar a|calle|av\.|avenida)\s*[:=-]?\s*(.+)/i);
      if (addrMatch) {
        address = addrMatch[1].trim();
      }
    }

    // Buscar referencia
    if (!reference) {
      const refMatch = line.match(/(?:referencia|ref|cerca de|frente a|al lado|edif|edificio|apto|apartamento)\s*[:=-]?\s*(.+)/i);
      if (refMatch) {
        reference = refMatch[1].trim();
      }
    }
  }

  // Fallback para dirección si contiene palabras clave de calles
  if (!address && !isPickup) {
    const streetMatch = text.match(/(?:calle|av\.|avenida|residencia|torre|edif|edificio|manzana|km)\s+[^,\n.]+/i);
    if (streetMatch) {
      address = streetMatch[0].trim();
    }
  }

  // Fallback para nombre si la primera línea parece un nombre
  if (!name && lines.length > 0) {
    const firstLine = lines[0];
    if (
      !firstLine.includes('http') &&
      !phoneRegex.test(firstLine) &&
      !/(?:pedido|hola|buenos|quiero|orden|favor|lasa[nñ]a|delivery|precio)/i.test(firstLine) &&
      firstLine.length < 35
    ) {
      name = firstLine.replace(/^[*-•\s]+/, '').trim();
    }
  }

  return { name, phone, address, reference, notes, isPickup };
}

// ==================== SEMÁFORO DE TIEMPO Y URGENCIA DE PEDIDOS ====================
export interface OrderUrgencyInfo {
  urgencyLevel: 'overdue' | 'critical' | 'warning' | 'normal' | 'future';
  diffMinutes: number;
  badgeLabel: string;
  isBlinking: boolean;
  borderClass: string;
  badgeClass: string;
  bgTintClass: string;
}

export function calculateOrderUrgency(order: Order, now: Date = new Date()): OrderUrgencyInfo {
  const status = (order.status || '').toLowerCase().trim();

  // Si ya fue entregado, cancelado o va en camino (ya salió de cocina)
  if (status === 'entregado' || status === 'cancelado') {
    return {
      urgencyLevel: 'normal',
      diffMinutes: 999,
      badgeLabel: order.status,
      isBlinking: false,
      borderClass: 'border-border-sora',
      badgeClass:
        status === 'entregado'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-red-50 text-red-800 border-red-200',
      bgTintClass: 'bg-white',
    };
  }

  if (status === 'en camino') {
    return {
      urgencyLevel: 'normal',
      diffMinutes: 999,
      badgeLabel: '🛵 En Camino',
      isBlinking: false,
      borderClass: 'border-blue-300',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      bgTintClass: 'bg-blue-50/20',
    };
  }

  const todayStr = now.toISOString().split('T')[0];

  // Si está programado para una fecha futura
  if (order.delivery_date && order.delivery_date > todayStr) {
    return {
      urgencyLevel: 'future',
      diffMinutes: 999,
      badgeLabel: `📅 ${order.delivery_date.split('-').slice(1).join('/')}${
        order.delivery_time ? ` • ${order.delivery_time}` : ''
      }`,
      isBlinking: false,
      borderClass: 'border-indigo-200',
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      bgTintClass: 'bg-indigo-50/15',
    };
  }

  // Si no tiene hora fijada para hoy
  if (!order.delivery_time) {
    return {
      urgencyLevel: 'normal',
      diffMinutes: 60,
      badgeLabel: status === 'en preparacion' ? '🔥 En Horno' : '📝 Inmediato',
      isBlinking: false,
      borderClass: 'border-border-sora',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      bgTintClass: 'bg-white',
    };
  }

  // Parsear delivery_time (HH:mm)
  const [h, m] = order.delivery_time.split(':').map((n) => parseInt(n, 10));
  if (isNaN(h)) {
    return {
      urgencyLevel: 'normal',
      diffMinutes: 60,
      badgeLabel: order.status,
      isBlinking: false,
      borderClass: 'border-border-sora',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      bgTintClass: 'bg-white',
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const deliveryMinutes = h * 60 + (m || 0);
  const diff = deliveryMinutes - currentMinutes;

  if (diff < 0) {
    // ¡RETRASADO / VENCIDO! La hora prometida ya llegó y no ha salido
    return {
      urgencyLevel: 'overdue',
      diffMinutes: diff,
      badgeLabel: `🚨 VENCIDO (${Math.abs(diff)} min tarde)`,
      isBlinking: true,
      borderClass: 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse',
      badgeClass: 'bg-rose-600 text-white border-rose-600 font-bold animate-pulse',
      bgTintClass: 'bg-rose-50/70',
    };
  }

  if (diff <= 15) {
    // ¡CRÍTICO! Faltan 15 min o menos y sigue en cocina
    return {
      urgencyLevel: 'critical',
      diffMinutes: diff,
      badgeLabel: `⚠️ ¡URGENTE! Faltan ${diff} min`,
      isBlinking: true,
      borderClass: 'border-rose-400 ring-2 ring-rose-400/30 animate-pulse',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      bgTintClass: 'bg-rose-50/40',
    };
  }

  if (diff <= 35) {
    // Alerta temprana (amarillo/ámbar)
    return {
      urgencyLevel: 'warning',
      diffMinutes: diff,
      badgeLabel: `⏰ Faltan ${diff} min`,
      isBlinking: false,
      borderClass: 'border-amber-400 ring-1 ring-amber-300',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      bgTintClass: 'bg-amber-50/30',
    };
  }

  // A tiempo (> 35 min)
  return {
    urgencyLevel: 'normal',
    diffMinutes: diff,
    badgeLabel: `🟢 A tiempo (${diff} min)`,
    isBlinking: false,
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
    bgTintClass: 'bg-white',
  };
}

