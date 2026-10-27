'use client';

import { Order, Client, ClientAddress } from '@/types/database.types';
import {
  getStoredOrders,
  saveStoredOrders,
  getStoredClients,
  saveStoredClients,
  getStoredAddresses,
  saveStoredAddresses,
  isValidUuid,
} from '@/lib/storage';

/**
 * Prepara el objeto de pedido para Supabase, manteniendo solo las columnas existentes en la tabla
 */
export function buildSupabaseOrderPayload(order: Order): any {
  const payload: any = {
    id: order.id,
    order_number: order.order_number,
    client_name: order.client_name,
    client_phone: order.client_phone,
    address: order.address,
    address_label: order.address_label || null,
    address_reference: order.address_reference || null,
    latitude: order.latitude ?? null,
    longitude: order.longitude ?? null,
    items: order.items,
    total: order.total,
    delivery_fee: order.delivery_fee || 0,
    payment_method: order.payment_method || 'efectivo',
    payment_status: order.payment_status || 'pendiente',
    status: order.status || 'Pendiente',
    delivery_date: order.delivery_date,
    delivery_time: order.delivery_time || null,
    production_reminder_time: order.production_reminder_time || null,
    is_scheduled: order.is_scheduled || false,
    notes: order.notes || null,
  };

  if (order.created_at) payload.created_at = order.created_at;
  if (order.updated_at) payload.updated_at = order.updated_at;

  if (isValidUuid(order.client_id)) payload.client_id = order.client_id;
  if (isValidUuid(order.address_id)) payload.address_id = order.address_id;
  if (isValidUuid(order.delivery_user_id)) {
    payload.delivery_user_id = order.delivery_user_id;
  }
  payload.delivery_user_name = order.delivery_user_name || null;

  return payload;
}

/**
 * Guarda o actualiza un pedido en Supabase de forma 100% resiliente:
 * - Upsertea el cliente si está presente
 * - Upsertea la dirección si está presente (sin is_default)
 * - Upsertea el pedido
 * - Si ocurre violación de clave foránea (23503), reintenta sin las claves foráneas
 */
export async function syncOrderToSupabase(supabase: any, order: Order): Promise<boolean> {
  if (!order || !order.id) return false;

  try {
    // 1. Si tiene client_id válido, asegurar que exista en la tabla clients de Supabase
    if (isValidUuid(order.client_id)) {
      try {
        await supabase.from('clients').upsert([
          {
            id: order.client_id,
            name: order.client_name || 'Cliente',
            phone: order.client_phone || '',
          },
        ]);
      } catch (ce) {
        console.warn('Sync client fallback warn:', ce);
      }
    }

    // 2. Si tiene address_id válido, asegurar que exista en client_addresses (sin is_default)
    if (isValidUuid(order.address_id) && isValidUuid(order.client_id)) {
      try {
        await supabase.from('client_addresses').upsert([
          {
            id: order.address_id,
            client_id: order.client_id,
            label: order.address_label || 'Casa',
            address: order.address || 'Dirección',
            reference: order.address_reference || null,
            latitude: order.latitude ?? null,
            longitude: order.longitude ?? null,
          },
        ]);
      } catch (ae) {
        console.warn('Sync address fallback warn:', ae);
      }
    }

    // 3. Preparar e insertar/upsertar pedido
    const payload = buildSupabaseOrderPayload(order);
    const { error } = await supabase.from('orders').upsert([payload]);

    if (error) {
      console.warn('Supabase upsert error:', error.message, error.code);
      // Fallback clave foránea (23503)
      if (error.code === '23503') {
        const safePayload = {
          ...payload,
          client_id: null,
          address_id: null,
          delivery_user_id: null,
        };
        const { error: retryErr } = await supabase.from('orders').upsert([safePayload]);
        if (retryErr) {
          console.error('Safe fallback upsert error:', retryErr);
          return false;
        }
        return true;
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error sincronizando orden a Supabase:', err);
    return false;
  }
}

/**
 * Busca pedidos en almacenamiento local (iPad / browser) que no existan en Supabase
 * y los sincroniza automáticamente en segundo plano
 */
export async function syncPendingOrdersToSupabase(supabase: any): Promise<number> {
  try {
    const cachedOrders = getStoredOrders();
    if (!cachedOrders || cachedOrders.length === 0) return 0;

    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select('id, order_number');

    if (error || !dbOrders) return 0;

    const dbIdSet = new Set(dbOrders.map((o: any) => o.id));
    const dbNumSet = new Set(dbOrders.map((o: any) => o.order_number).filter(Boolean));

    const unsynced = cachedOrders.filter(
      (cached) => !dbIdSet.has(cached.id) && (!cached.order_number || !dbNumSet.has(cached.order_number))
    );

    if (unsynced.length === 0) return 0;

    console.log(`[Auto-Sync] Sincronizando ${unsynced.length} pedidos locales pendientes con Supabase...`);

    let syncedCount = 0;
    for (const ord of unsynced) {
      const ok = await syncOrderToSupabase(supabase, ord);
      if (ok) syncedCount++;
    }

    return syncedCount;
  } catch (err) {
    console.warn('Error en auto-sync de pedidos:', err);
    return 0;
  }
}

/**
 * Sincroniza clientes y direcciones locales pendientes con Supabase
 */
export async function syncPendingClientsToSupabase(supabase: any): Promise<void> {
  try {
    const cachedClients = getStoredClients();
    const cachedAddresses = getStoredAddresses();

    if (cachedClients.length === 0 && cachedAddresses.length === 0) return;

    const { data: dbClients } = await supabase.from('clients').select('id');
    const existingClientIds = new Set((dbClients || []).map((c: any) => c.id));

    const unsyncedClients = cachedClients.filter(
      (c) => isValidUuid(c.id) && !existingClientIds.has(c.id)
    );

    if (unsyncedClients.length > 0) {
      await supabase.from('clients').upsert(
        unsyncedClients.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          notes: c.notes || null,
        }))
      );
    }

    const { data: dbAddresses } = await supabase.from('client_addresses').select('id');
    const existingAddressIds = new Set((dbAddresses || []).map((a: any) => a.id));

    const unsyncedAddresses = cachedAddresses.filter(
      (a) => isValidUuid(a.id) && isValidUuid(a.client_id) && !existingAddressIds.has(a.id)
    );

    if (unsyncedAddresses.length > 0) {
      await supabase.from('client_addresses').upsert(
        unsyncedAddresses.map((a) => ({
          id: a.id,
          client_id: a.client_id,
          label: a.label || 'Casa',
          address: a.address,
          reference: a.reference || null,
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
        }))
      );
    }
  } catch (err) {
    console.warn('Error en auto-sync de clientes y direcciones:', err);
  }
}
