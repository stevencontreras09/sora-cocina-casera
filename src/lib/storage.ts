'use client';

import { Order, Client, ClientAddress, Expense, Profile } from '@/types/database.types';

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
        localStorage.setItem(`sora_perms_${u.id}`, JSON.stringify(u.permissions));
      }
      if (u.email && u.permissions) {
        localStorage.setItem(`sora_perms_${u.email.toLowerCase()}`, JSON.stringify(u.permissions));
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
    const key = `sora_perms_${userIdOrEmail.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

