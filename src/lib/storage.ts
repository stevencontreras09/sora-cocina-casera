'use client';

import { Order, Client, Expense, Profile } from '@/types/database.types';

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

// ==================== CLIENTES (CLIENTS) ====================
const CLIENTS_STORAGE_KEY = 'sora_clients_cache_v2';

export function getStoredClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredClients(clients: Client[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    notifyAutoSave('Clientes y Direcciones');
  } catch (e) {
    console.warn('Error al guardar clientes localmente:', e);
  }
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
