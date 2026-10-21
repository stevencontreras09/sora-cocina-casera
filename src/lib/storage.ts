'use client';

import { Order, Client, ClientAddress, Expense, Profile, MenuItem } from '@/types/database.types';

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

