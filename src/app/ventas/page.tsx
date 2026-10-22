'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { createClient } from '@/lib/supabase/client';
import {
  Order,
  Client,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  MenuItem,
} from '@/types/database.types';
import { formatCurrency, cleanPhoneNumber } from '@/lib/utils';
import {
  saveStoredOrders,
  getStoredOrders,
  mergeClientsWithCached,
  isValidUuid,
  generateUuid,
  getStoredMenuItems,
  saveStoredMenuItems,
  DEFAULT_MENU_ITEMS,
  calculateOrderUrgency,
  extractWhatsAppMessage,
} from '@/lib/storage';
import { triggerKitchenAlert } from '@/lib/audioAlerts';
import { ProductionReminderAlerts } from '@/components/alerts/ProductionReminderAlerts';
import {
  calculateEstimatedDeliveryFee,
  DeliveryFeeEstimate,
  SORA_KITCHEN_COORDS,
} from '@/lib/routeOptimizer';
import { MenuManagerModal } from '@/components/ventas/MenuManagerModal';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  MessageCircle,
  Truck,
  CreditCard,
  Banknote,
  Search,
  AlertCircle,
  RefreshCw,
  Flame,
  Bell,
  X,
  Compass,
  Check,
  XCircle,
  UtensilsCrossed,
  Store,
  Sparkles,
  Calendar,
  Sun,
} from 'lucide-react';

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), []);

  // Clientes y Repartidores
  const [clients, setClients] = useState<Client[]>([]);
  const [deliveryDrivers, setDeliveryDrivers] = useState<{ id: string; name: string }[]>([]);

  // Platos Dinámicos del Menú (Por defecto: Lasaña Individual RD$ 350 y Lasaña Familiar RD$ 700)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getStoredMenuItems());
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Estado de edición de pedido
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Estados del Formulario de Pedido
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      name: 'Lasaña Casera (Porción Individual)',
      quantity: 1,
      price: 350,
      subtotal: 350,
    },
  ]);

  // Costo de envío dinámico / estimado por distancia
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pagado');
  const [deliveryUserId, setDeliveryUserId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Horario y fecha de entrega
  const todayStr = new Date().toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState<string>(todayStr);
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [productionReminderTime, setProductionReminderTime] = useState<string>('60m');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Lista de pedidos reales
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Reloj vivo para actualizar semáforo de tiempo de pedidos en tiempo real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 25000);
    return () => clearInterval(interval);
  }, []);

  // Panel rápido para extraer WhatsApp en ventas
  const [quickWhatsappText, setQuickWhatsappText] = useState('');
  const [showQuickWhatsapp, setShowQuickWhatsapp] = useState(false);
  const [quickWhatsappNotice, setQuickWhatsappNotice] = useState<string | null>(null);

  // Cargar datos (Supabase + Respaldo Local Auto-guardado)
  const loadData = async () => {
    setIsLoadingOrders(true);
    try {
      // 1. Cargar Clientes y Direcciones con fusión segura (CERO pérdida de direcciones)
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      const { data: addressesData } = await supabase
        .from('client_addresses')
        .select('*');

      const mergedClients = mergeClientsWithCached(
        clientsData || [],
        addressesData || []
      );
      setClients(mergedClients);

      // 2. Cargar Repartidores
      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'delivery')
        .eq('is_active', true);

      if (driversData && driversData.length > 0) {
        setDeliveryDrivers(
          driversData.map((d) => ({
            id: d.id,
            name: d.full_name || 'Repartidor',
          }))
        );
      }

      // 3. Cargar Pedidos
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData as Order[]);
        saveStoredOrders(ordersData as Order[]);
      } else {
        const cachedOrders = getStoredOrders();
        if (cachedOrders.length > 0) {
          setOrders(cachedOrders);
        }
      }

      // 4. Intentar cargar Menú de platos desde store_settings en Supabase si existe
      try {
        const { data: menuSetting } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'menu')
          .single();

        if (menuSetting?.value && Array.isArray(menuSetting.value) && menuSetting.value.length > 0) {
          setMenuItems(menuSetting.value);
          saveStoredMenuItems(menuSetting.value);
        }
      } catch (e) {
        // Fallback a localStorage
      }
    } catch (err) {
      console.warn('Cargando respaldo local de ventas');
      const cached = getStoredOrders();
      if (cached.length > 0) setOrders(cached);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();

    // Sincronización en tiempo real vía WebSockets para la tabla 'orders'
    const channel = supabase
      .channel('ventas-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new) {
            const incoming = payload.new as Order;
            setOrders((prev) => {
              if (prev.some((o) => o.id === incoming.id)) return prev;
              const next = [incoming, ...prev];
              saveStoredOrders(next);
              return next;
            });
            triggerKitchenAlert(
              '¡Nueva Orden en Cocina!',
              `Pedido #${incoming.order_number || ''} para ${incoming.client_name || 'Cliente'}. Total: RD$ ${incoming.total || 0}`,
              'new_order',
              incoming.order_number
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new) {
            const incoming = payload.new as Order;
            setOrders((prev) => {
              const next = prev.map((o) => (o.id === incoming.id ? { ...o, ...incoming } : o));
              saveStoredOrders(next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.old) {
            const deletedId = payload.old.id;
            setOrders((prev) => {
              const next = prev.filter((o) => o.id !== deletedId);
              saveStoredOrders(next);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Guardar platos del menú tanto en memoria, localStorage y Supabase
  const handleSaveMenuItems = async (newItems: MenuItem[]) => {
    setMenuItems(newItems);
    saveStoredMenuItems(newItems);

    try {
      await supabase.from('store_settings').upsert({
        key: 'menu',
        value: newItems,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      // Persistido con éxito localmente
    }
  };

  const currentClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const availableAddresses = useMemo(
    () => currentClient?.addresses || [],
    [currentClient]
  );

  useEffect(() => {
    if (availableAddresses.length > 0) {
      const defaultAddr =
        availableAddresses.find((a) => a.is_default) || availableAddresses[0];
      setSelectedAddressId(defaultAddr.id);
    } else {
      setSelectedAddressId('');
    }
  }, [availableAddresses]);

  const currentAddress = useMemo(
    () => availableAddresses.find((a) => a.id === selectedAddressId) || null,
    [availableAddresses, selectedAddressId]
  );

  // Estimación de costo de envío según coordenadas GPS de la dirección
  const feeEstimate = useMemo<DeliveryFeeEstimate | null>(() => {
    if (!currentAddress || typeof currentAddress.latitude !== 'number' || typeof currentAddress.longitude !== 'number') {
      return null;
    }
    return calculateEstimatedDeliveryFee(
      currentAddress.latitude,
      currentAddress.longitude
    );
  }, [currentAddress]);

  // Actualizar tarifa sugerida automáticamente si cambia la dirección y no se está editando
  useEffect(() => {
    if (editingOrder) return;
    if (deliveryType === 'pickup') {
      setDeliveryFee(0);
      return;
    }
    if (feeEstimate) {
      setDeliveryFee(feeEstimate.suggestedFee);
    } else {
      setDeliveryFee(0);
    }
  }, [feeEstimate, editingOrder, deliveryType]);

  // Extracción rápida de cliente o comanda desde texto copiado de WhatsApp
  const handleQuickWhatsAppExtract = async () => {
    if (!quickWhatsappText.trim()) return;
    const extracted = extractWhatsAppMessage(quickWhatsappText);

    // 1. Si detecta modalidad pickup
    if (extracted.isPickup) {
      setDeliveryType('pickup');
    }

    // 2. Buscar si ya existe el cliente por teléfono o nombre
    let found = clients.find((c) => {
      const p1 = cleanPhoneNumber(c.phone);
      const p2 = cleanPhoneNumber(extracted.phone);
      return (
        (p1 && p2 && (p1.includes(p2) || p2.includes(p1))) ||
        (extracted.name && c.name.toLowerCase().includes(extracted.name.toLowerCase()))
      );
    });

    if (found) {
      setSelectedClientId(found.id);
      setQuickWhatsappNotice(`¡Cliente "${found.name}" seleccionado automáticamente!`);
    } else if (extracted.name || extracted.phone) {
      const newCId = generateUuid();
      const newAddrId = generateUuid();
      const isPick = extracted.isPickup;
      const newClientObj: Client = {
        id: newCId,
        name: extracted.name || 'Cliente WhatsApp',
        phone: extracted.phone || '',
        notes: 'Creado desde WhatsApp en Ventas',
        addresses: [
          {
            id: newAddrId,
            client_id: newCId,
            label: isPick ? 'Retiro en Local' : 'Casa',
            address: isPick
              ? (SORA_KITCHEN_COORDS.address || 'Sora Cocina Casera')
              : (extracted.address || 'Dirección por confirmar'),
            reference: extracted.reference || null,
            latitude: isPick ? SORA_KITCHEN_COORDS.lat : null,
            longitude: isPick ? SORA_KITCHEN_COORDS.lng : null,
            is_default: true,
          },
        ],
      };

      const updated = [newClientObj, ...clients];
      setClients(updated);
      setSelectedClientId(newCId);
      setSelectedAddressId(newAddrId);

      try {
        await supabase.from('clients').insert([
          {
            id: newCId,
            name: newClientObj.name,
            phone: newClientObj.phone,
            notes: newClientObj.notes,
          },
        ]);
      } catch (_) {}

      setQuickWhatsappNotice(
        `¡Cliente "${newClientObj.name}" registrado y seleccionado con éxito!`
      );
    } else {
      setQuickWhatsappNotice('No se encontraron datos claros de cliente en el texto.');
    }

    setTimeout(() => setQuickWhatsappNotice(null), 3500);
  };

  const handleItemChange = (
    index: number,
    field: 'name' | 'quantity' | 'price',
    value: any
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'name') {
      item.name = value;
      const matched = menuItems.find(
        (m) => m.name.toLowerCase().trim() === value.toLowerCase().trim()
      );
      if (matched) {
        item.price = matched.price;
      }
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'price') {
      item.price = Math.max(0, parseFloat(value) || 0);
    }

    item.subtotal = item.quantity * item.price;
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = (dishName = '', price = 0) => {
    const defaultDish =
      menuItems[0] || { name: 'Lasaña Casera (Porción Individual)', price: 350 };
    const finalName = dishName || defaultDish.name;
    const finalPrice = price || defaultDish.price;

    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: finalName,
        quantity: 1,
        price: finalPrice,
        subtotal: finalPrice,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Subtotal solo de platos
  const subtotalDishes = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items]
  );

  // Total global = Subtotal Platos + Tarifa de Envío
  const totalCalculated = useMemo(
    () => subtotalDishes + (Number(deliveryFee) || 0),
    [subtotalDishes, deliveryFee]
  );

  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [clients, clientSearchQuery]);

  // Actualizar estado de una orden
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updatedList = orders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updatedList);
    saveStoredOrders(updatedList);

    try {
      await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
    } catch (e) {
      console.warn('Actualización local persistida');
    }
  };

  // Cargar orden en modo edición
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setSelectedClientId(order.client_id || '');
    setSelectedAddressId(order.address_id || '');
    setItems(
      order.items && order.items.length > 0
        ? order.items
        : [
            {
              id: 'item-1',
              name: menuItems[0]?.name || 'Lasaña Casera (Porción Individual)',
              quantity: 1,
              price: menuItems[0]?.price || 350,
              subtotal: menuItems[0]?.price || 350,
            },
          ]
    );
    setPaymentMethod(order.payment_method || 'efectivo');
    setPaymentStatus(order.payment_status || 'pagado');
    setDeliveryUserId(order.delivery_user_id || '');
    setNotes(order.notes || '');
    setDeliveryDate(order.delivery_date || todayStr);
    setDeliveryTime(order.delivery_time || '');
    setIsScheduled(!!order.is_scheduled);
    setProductionReminderTime(order.production_reminder_time || '60m');

    const itemsSub = (order.items || []).reduce((s, it) => s + it.subtotal, 0);
    const initialFee =
      order.delivery_fee !== undefined
        ? order.delivery_fee
        : Math.max(0, (order.total || 0) - itemsSub);
    setDeliveryFee(initialFee);

    const isPickupOrder =
      order.delivery_type === 'pickup' ||
      order.delivery_user_name === 'Retiro en Local' ||
      (Boolean(order.address) && order.address.toLowerCase().includes('retiro en local'));
    setDeliveryType(isPickupOrder ? 'pickup' : 'delivery');

    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Cancelar modo de edición y limpiar formulario
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setDeliveryType('delivery');
    setNotes('');
    setDeliveryTime('');
    setIsScheduled(false);
    setDeliveryFee(0);
    const defaultDish =
      menuItems[0] || { name: 'Lasaña Casera (Porción Individual)', price: 350 };
    setItems([
      {
        id: `item-${Date.now()}`,
        name: defaultDish.name,
        quantity: 1,
        price: defaultDish.price,
        subtotal: defaultDish.price,
      },
    ]);
  };

  // Eliminar pedido permanentemente
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar permanentemente el pedido #${orderNumber}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    const updatedList = orders.filter((o) => o.id !== orderId);
    setOrders(updatedList);
    saveStoredOrders(updatedList);

    if (editingOrder?.id === orderId) {
      handleCancelEdit();
    }

    try {
      if (isValidUuid(orderId)) {
        await supabase.from('orders').delete().eq('id', orderId);
      }
    } catch (e) {
      console.warn('Pedido eliminado localmente');
    }

    setSuccessNotice(`Pedido #${orderNumber} eliminado permanentemente.`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Marcar pedido como cancelado
  const handleCancelOrderStatus = async (orderId: string, orderNumber: string) => {
    if (!confirm(`¿Marcar el pedido #${orderNumber} como 'Cancelado'?`)) {
      return;
    }
    await handleUpdateOrderStatus(orderId, 'Cancelado');
    setSuccessNotice(`Pedido #${orderNumber} marcado como Cancelado.`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // CREACIÓN O EDICIÓN DEL PEDIDO
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) {
      alert('Por favor selecciona un cliente para el pedido.');
      return;
    }

    setIsSubmitting(true);
    const driverObj = deliveryDrivers.find((d) => d.id === deliveryUserId);
    const isPickup = deliveryType === 'pickup';
    const finalAddress = isPickup ? 'Retiro en local (Cocina Sora)' : (currentAddress?.address || 'Retiro en local');
    const finalAddressLabel = isPickup ? 'Retiro en Local' : (currentAddress?.label || 'Dirección');
    const finalAddressRef = isPickup ? 'Sora Cocina Casera' : (currentAddress?.reference || undefined);
    const finalDeliveryUserName = isPickup ? 'Retiro en Local' : (driverObj?.name || 'Por asignar');
    const finalDeliveryUserId = isPickup ? null : (deliveryUserId || null);
    const finalDeliveryFee = isPickup ? 0 : (Number(deliveryFee) || 0);
    const finalLat = isPickup ? SORA_KITCHEN_COORDS.lat : currentAddress?.latitude;
    const finalLng = isPickup ? SORA_KITCHEN_COORDS.lng : currentAddress?.longitude;

    if (editingOrder) {
      // 1. ACTUALIZAR PEDIDO EXISTENTE
      const updatedOrder: Order = {
        ...editingOrder,
        client_id: currentClient.id,
        client_name: currentClient.name,
        client_phone: currentClient.phone,
        delivery_type: deliveryType,
        address_id: isPickup ? undefined : currentAddress?.id,
        address_label: finalAddressLabel,
        address: finalAddress,
        address_reference: finalAddressRef,
        latitude: finalLat,
        longitude: finalLng,
        items: items,
        delivery_fee: finalDeliveryFee,
        distance_km: isPickup ? 0 : (feeEstimate?.distanceKm || undefined),
        total: totalCalculated,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        delivery_user_id: finalDeliveryUserId,
        delivery_user_name: finalDeliveryUserName,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || undefined,
        production_reminder_time: productionReminderTime,
        is_scheduled: isScheduled || deliveryDate > todayStr,
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      const updatedList = orders.map((o) =>
        o.id === editingOrder.id ? updatedOrder : o
      );
      setOrders(updatedList);
      saveStoredOrders(updatedList);

      try {
        if (isValidUuid(editingOrder.id)) {
          await supabase
            .from('orders')
            .update({
              client_id: isValidUuid(currentClient.id) ? currentClient.id : undefined,
              client_name: currentClient.name,
              client_phone: currentClient.phone,
              address: finalAddress,
              items: items,
              total: totalCalculated,
              payment_method: paymentMethod,
              payment_status: paymentStatus,
              delivery_date: deliveryDate,
              notes: notes || null,
            })
            .eq('id', editingOrder.id);
        }
      } catch (err) {
        console.warn('Orden actualizada en respaldo local');
      }

      setEditingOrder(null);
      setIsSubmitting(false);
      setSuccessNotice(
        `¡Pedido #${editingOrder.order_number} modificado y guardado con éxito!`
      );

      // Resetear formulario con el primer plato del menú
      const defaultDish =
        menuItems[0] || { name: 'Lasaña Casera (Porción Individual)', price: 350 };
      setItems([
        {
          id: `item-${Date.now()}`,
          name: defaultDish.name,
          quantity: 1,
          price: defaultDish.price,
          subtotal: defaultDish.price,
        },
      ]);
      setNotes('');
      setDeliveryTime('');
      setIsScheduled(false);
      setDeliveryFee(0);

      setTimeout(() => {
        setSuccessNotice(null), 4500;
      });
    } else {
      // 2. CREAR NUEVO PEDIDO
      const orderNumber = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrderId = generateUuid();

      const newOrder: Order = {
        id: newOrderId,
        order_number: orderNumber,
        client_id: currentClient.id,
        client_name: currentClient.name,
        client_phone: currentClient.phone,
        delivery_type: deliveryType,
        address_id: isPickup ? undefined : currentAddress?.id,
        address_label: finalAddressLabel,
        address: finalAddress,
        address_reference: finalAddressRef,
        latitude: finalLat,
        longitude: finalLng,
        items: items,
        delivery_fee: finalDeliveryFee,
        distance_km: isPickup ? 0 : (feeEstimate?.distanceKm || undefined),
        total: totalCalculated,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        delivery_user_id: finalDeliveryUserId,
        delivery_user_name: finalDeliveryUserName,
        status: 'Pendiente',
        delivery_date: deliveryDate,
        delivery_time: deliveryTime || undefined,
        production_reminder_time: productionReminderTime,
        is_scheduled: isScheduled || deliveryDate > todayStr,
        notes: notes,
        created_at: new Date().toISOString(),
      };

      const updatedList = [newOrder, ...orders];
      setOrders(updatedList);
      saveStoredOrders(updatedList);

      try {
        const supabasePayload: any = {
          id: newOrderId,
          order_number: orderNumber,
          client_name: currentClient.name,
          client_phone: currentClient.phone,
          address: finalAddress,
          address_label: finalAddressLabel,
          address_reference: finalAddressRef,
          latitude: finalLat,
          longitude: finalLng,
          items: items,
          total: totalCalculated,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          status: 'Pendiente',
          delivery_date: deliveryDate,
          delivery_time: deliveryTime || null,
          production_reminder_time: productionReminderTime,
          is_scheduled: isScheduled || deliveryDate > todayStr,
          notes: notes || null,
        };

        if (isValidUuid(currentClient.id)) supabasePayload.client_id = currentClient.id;
        if (!isPickup && currentAddress && isValidUuid(currentAddress.id)) supabasePayload.address_id = currentAddress.id;
        if (!isPickup && isValidUuid(deliveryUserId)) {
          supabasePayload.delivery_user_id = deliveryUserId;
          supabasePayload.delivery_user_name = driverObj?.name || null;
        }

        const { error } = await supabase.from('orders').insert([supabasePayload]);
        if (error) {
          console.warn('Nota Supabase orders insert:', error.message);
          // Si la tabla orders en Supabase aún no tiene todas las columnas, reintentar con las columnas existentes
          if (error.code === '42703') {
            const fallbackItems = [
              {
                _metadata: {
                  order_number: orderNumber,
                  client_name: currentClient.name,
                  client_phone: currentClient.phone,
                  address: currentAddress?.address || 'Retiro en local',
                  address_reference: currentAddress?.reference || null,
                  notes: notes || null,
                },
                ...(items[0] || { name: 'Comanda de Cocina', quantity: 1, price: totalCalculated }),
              },
              ...items.slice(1),
            ];

            const fallbackPayload: any = {
              id: newOrderId,
              total: totalCalculated,
              payment_method: paymentMethod,
              payment_status: paymentStatus,
              status: 'Pendiente',
              items: fallbackItems,
            };
            if (isValidUuid(currentClient.id)) fallbackPayload.client_id = currentClient.id;
            if (isValidUuid(deliveryUserId)) fallbackPayload.delivery_user_id = deliveryUserId;

            await supabase.from('orders').insert([fallbackPayload]);
          }
        }
      } catch (err) {
        console.warn('Orden guardada en caché local persistente');
      }

      // Campana auditiva de cocina
      triggerKitchenAlert(
        '¡Nueva Orden en Cocina!',
        `Pedido #${orderNumber} para ${currentClient.name} (${formatCurrency(totalCalculated)}). Entrega: ${deliveryTime || 'Inmediata'}.`,
        'new_order',
        orderNumber
      );

      setIsSubmitting(false);
      setSuccessNotice(
        `¡Pedido #${orderNumber} creado y guardado automáticamente! 🔔 Campana de cocina activada.`
      );

      // Auto-guardado de platos agregados en el menú de la base de datos para ventas futuras
      try {
        const existingDishNames = new Set(menuItems.map((m) => m.name.toLowerCase().trim()));
        const newDishesToAdd: MenuItem[] = [];
        items.forEach((it) => {
          const normName = (it.name || '').toLowerCase().trim();
          if (normName && !existingDishNames.has(normName)) {
            existingDishNames.add(normName);
            newDishesToAdd.push({
              id: generateUuid(),
              name: it.name.trim(),
              price: it.price || 0,
              category: 'Platos',
              is_available: true,
            });
          }
        });
        if (newDishesToAdd.length > 0) {
          const updatedMenu = [...menuItems, ...newDishesToAdd];
          handleSaveMenuItems(updatedMenu);
        }
      } catch (e) {
        console.warn('Auto-guardado de plato en menú:', e);
      }

      // Resetear formulario con el primer plato del menú
      const defaultDish =
        menuItems[0] || { name: 'Lasaña Casera (Porción Individual)', price: 350 };
      setItems([
        {
          id: `item-${Date.now()}`,
          name: defaultDish.name,
          quantity: 1,
          price: defaultDish.price,
          subtotal: defaultDish.price,
        },
      ]);
      setNotes('');
      setDeliveryTime('');
      setIsScheduled(false);
      setDeliveryFee(0);

      setTimeout(() => {
        setSuccessNotice(null);
      }, 4500);
    }
  };

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Módulo de Ventas
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Moneda: DOP (RD$)
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Creación, Edición y Despacho de Pedidos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Registra pedidos, calcula el costo de envío según la distancia desde Sora y administra el menú de platos.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setIsMenuModalOpen(true)}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
              title="Gestionar platos del menú y sus precios"
            >
              <UtensilsCrossed className="w-4 h-4 text-primary-sora" />
              <span>Editar Menú ({menuItems.length})</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoadingOrders}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
              title="Refrescar pedidos y clientes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-primary-sora' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Banner de Notificación de Éxito */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-sm">{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="p-1 text-emerald-600 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ALERTA DE PRODUCCIÓN */}
        <ProductionReminderAlerts
          orders={orders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* COLUMNA IZQUIERDA: FORMULARIO DE NUEVO/EDICIÓN PEDIDO */}
          <div className="lg:col-span-7 bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
            {/* Banner de Modo Edición */}
            {editingOrder && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-amber-950">
                      Editando Pedido #{editingOrder.order_number}
                    </h3>
                    <p className="text-xs text-amber-800/80">
                      Modifica platos, dirección, envío o repartidor y guarda los cambios.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
                >
                  Cancelar Edición
                </button>
              </div>
            )}

            <div className="pb-4 border-b border-border-sora flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm text-white ${
                    editingOrder ? 'bg-amber-600' : 'bg-primary-sora'
                  }`}
                >
                  {editingOrder ? <Edit3 className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="font-serif font-bold text-lg text-text-sora">
                    {editingOrder ? `Modificar Pedido #${editingOrder.order_number}` : 'Nuevo Pedido'}
                  </h2>
                  <p className="text-xs text-text-sora/60">
                    {editingOrder
                      ? 'Actualiza los platos, envío y datos del cliente'
                      : 'Completar datos de entrega, platos y recordatorio de producción'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-5">
              {/* 1. SELECCIÓN DE CLIENTE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    1. Seleccionar Cliente *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickWhatsapp(!showQuickWhatsapp)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-primary-sora/10 text-primary-sora border border-primary-sora/25 hover:bg-primary-sora hover:text-white transition-all text-[11px] font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showQuickWhatsapp ? 'Cerrar' : '✨ Pegar WhatsApp'}</span>
                  </button>
                </div>

                {showQuickWhatsapp && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-primary-sora/10 via-amber-500/5 to-white border border-primary-sora/30 space-y-2 animate-in fade-in">
                    <textarea
                      rows={2}
                      placeholder="Pega el mensaje de WhatsApp aquí para extraer nombre, teléfono, dirección o retiro en local..."
                      value={quickWhatsappText}
                      onChange={(e) => setQuickWhatsappText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-1 focus:ring-primary-sora"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleQuickWhatsAppExtract}
                        disabled={!quickWhatsappText.trim()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary-sora text-white text-xs font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Extraer y Seleccionar</span>
                      </button>
                      {quickWhatsappText && (
                        <button
                          type="button"
                          onClick={() => setQuickWhatsappText('')}
                          className="text-[11px] text-text-sora/50 hover:text-text-sora"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    {quickWhatsappNotice && (
                      <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        {quickWhatsappNotice}
                      </p>
                    )}
                  </div>
                )}

                {clients.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aún no hay clientes registrados en el directorio.</p>
                      <p className="mt-0.5 text-[11px]">
                        Ve a la pestaña <strong>Clientes</strong> para registrar el primero y asignarle dirección en la misma vista.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-text-sora/40 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filtrar por nombre o teléfono..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                      />
                    </div>

                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                    >
                      <option value="">-- Elige un cliente ({filteredClients.length}) --</option>
                      {filteredClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {currentClient && (
                  <div className="p-3 rounded-2xl bg-bg-sora/80 border border-border-sora flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-primary-sora" />
                      <span className="font-semibold text-text-sora">{currentClient.name}</span>
                      <span className="text-text-sora/60">({currentClient.phone})</span>
                    </div>
                    {currentClient.notes && (
                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate max-w-xs">
                        {currentClient.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. MODALIDAD Y DESTINO DE ENTREGA */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    2. Modalidad de Entrega *
                  </label>
                  {deliveryType === 'delivery' && currentAddress && currentAddress.latitude && currentAddress.longitude && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center">
                      <Compass className="w-3 h-3 mr-1" />
                      GPS Vinculado
                    </span>
                  )}
                </div>

                {/* Selector Visual de Modalidad: Delivery vs Retiro en Local */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('delivery');
                      if (feeEstimate) setDeliveryFee(feeEstimate.suggestedFee);
                    }}
                    className={`p-3 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold border transition-all ${
                      deliveryType === 'delivery'
                        ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>🛵 Envío a Domicilio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('pickup');
                      setDeliveryFee(0);
                      setDeliveryUserId('');
                    }}
                    className={`p-3 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold border transition-all ${
                      deliveryType === 'pickup'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>🏪 Retiro en el Local</span>
                  </button>
                </div>

                {deliveryType === 'pickup' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-3 animate-in fade-in">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-950">
                        🏪 Retiro en Cocina Sora (Mostrador / Takeout)
                      </p>
                      <p className="text-[11px] text-emerald-800/80 mt-0.5">
                        El cliente pasará a recoger el pedido directamente a nuestro local en Santo Domingo. <strong>Costo de envío: RD$ 0</strong> (No requiere motorista).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {availableAddresses.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-bg-sora/60 border border-border-sora text-text-sora/70 text-xs">
                        El cliente no tiene direcciones registradas. Agrega una en la pestaña <strong>Clientes</strong> o selecciona <strong>Retiro en el Local</strong>.
                      </div>
                    ) : (
                      <select
                        value={selectedAddressId}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                      >
                        {availableAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            [{addr.label}] {addr.address} {addr.reference ? `(${addr.reference})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* 3. HORARIO DE ENTREGA Y RECORDATORIO DE PRODUCCIÓN */}
              <div className="p-4 rounded-2xl bg-bg-sora/60 border border-border-sora space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-primary-sora" />
                    <span className="text-xs font-bold text-text-sora uppercase tracking-wider">
                      3. Horario y Programación de Entrega
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-text-sora/60 bg-white px-2 py-0.5 rounded-md border border-border-sora">
                    Alerta de Cocina
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(false);
                      setDeliveryDate(todayStr);
                      setDeliveryTime('');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      !isScheduled && deliveryDate === todayStr && !deliveryTime
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    ⚡ Inmediata
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(true);
                      setDeliveryDate(todayStr);
                      setDeliveryTime('12:30');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      isScheduled && deliveryDate === todayStr
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    ⏰ Para Hoy a las...
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduled(true);
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setDeliveryDate(d.toISOString().split('T')[0]);
                      setDeliveryTime('13:00');
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      isScheduled && deliveryDate > todayStr
                        ? 'bg-primary-sora text-white border-primary-sora shadow-xs'
                        : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                    }`}
                  >
                    📅 Días Futuros
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={deliveryDate}
                      onChange={(e) => {
                        setDeliveryDate(e.target.value);
                        if (e.target.value > todayStr) setIsScheduled(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text-sora/70 mb-1">
                      Hora Prometida de Entrega
                    </label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="Ej: 12:30"
                      className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-text-sora text-xs focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-text-sora/50 font-medium">Horas comunes:</span>
                  {['12:00', '12:30', '13:00', '13:30', '14:00', '19:30'].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setDeliveryTime(th)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                        deliveryTime === th
                          ? 'bg-primary-sora text-white border-primary-sora'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-border-sora/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-1.5 text-xs text-text-sora">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-semibold text-[11px]">Recordatorio de Producción:</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={
                        ['30m', '45m', '60m', '120m', '180m', '240m', 'inicio_dia'].includes(productionReminderTime)
                          ? productionReminderTime
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setProductionReminderTime('11:00');
                        } else {
                          setProductionReminderTime(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl border border-border-sora bg-white text-text-sora text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary-sora"
                    >
                      <option value="30m">Avisar 30 min antes</option>
                      <option value="45m">Avisar 45 min antes</option>
                      <option value="60m">Avisar 1 hora antes (Recomendado)</option>
                      <option value="120m">Avisar 2 horas antes</option>
                      <option value="180m">Avisar 3 horas antes</option>
                      <option value="240m">Avisar 4 horas antes</option>
                      <option value="inicio_dia">Avisar al inicio del día (8:00 AM)</option>
                      <option value="custom">⏰ Hora exacta manual...</option>
                    </select>

                    {!['30m', '45m', '60m', '120m', '180m', '240m', 'inicio_dia'].includes(productionReminderTime) && (
                      <input
                        type="time"
                        value={productionReminderTime}
                        onChange={(e) => setProductionReminderTime(e.target.value)}
                        className="px-2 py-0.5 rounded-lg border border-primary-sora/40 bg-white text-xs font-semibold text-primary-sora focus:outline-none focus:ring-1 focus:ring-primary-sora"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 4. ITEMS Y PLATOS DEL PEDIDO (CON GESTIÓN DINÁMICA DE MENÚ) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                    4. Platos del Menú *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsMenuModalOpen(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-bg-sora hover:bg-border-sora/60 border border-border-sora text-text-sora/80 text-xs font-semibold transition-colors"
                      title="Agregar, editar o eliminar platos del menú"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-primary-sora" />
                      <span>Gestionar Menú ({menuItems.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-primary-sora hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Línea</span>
                    </button>
                  </div>
                </div>

                {/* Accesos Rápidos con los platos actuales del Menú (Lasaña 350 y 700 por defecto) */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {menuItems.map((dish) => (
                    <button
                      key={dish.id || dish.name}
                      type="button"
                      onClick={() => handleAddItem(dish.name, dish.price)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-white hover:bg-primary-sora/10 hover:border-primary-sora/40 text-text-sora font-semibold border border-border-sora transition-all shadow-2xs flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 text-primary-sora" />
                      <span>{dish.name}</span>
                      <span className="text-primary-sora font-mono font-bold">
                        ({formatCurrency(dish.price)})
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-bg-sora/40 border border-border-sora grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-6 sm:col-span-7">
                        <input
                          type="text"
                          required
                          placeholder="Nombre del plato..."
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          list="sora-dishes"
                          className="w-full px-3 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora focus:outline-none focus:ring-1 focus:ring-primary-sora font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora text-center focus:outline-none focus:ring-1 focus:ring-primary-sora font-bold"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          required
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-border-sora bg-white text-xs text-text-sora text-right focus:outline-none focus:ring-1 focus:ring-primary-sora font-mono"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end space-x-1">
                        <span className="text-xs font-bold text-text-sora font-mono">
                          {formatCurrency(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length <= 1}
                          className="text-text-sora/30 hover:text-red-500 disabled:opacity-20 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="sora-dishes">
                  {menuItems.map((m) => (
                    <option key={m.id || m.name} value={m.name} />
                  ))}
                </datalist>
              </div>

              {/* 5. CÁLCULO ESTIMADO DE ENVÍO Y TOTAL A COBRAR */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-sora/10 to-amber-500/10 border border-primary-sora/25 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-primary-sora" />
                    <span className="text-xs font-bold text-primary-sora uppercase tracking-wider">
                      5. Envío y Desglose de Cobro
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-text-sora/70">
                    Subtotal Platos: {formatCurrency(subtotalDishes)}
                  </span>
                </div>

                {/* Estimación de distancia basada en el local oficial de Sora */}
                {feeEstimate ? (
                  <div className="p-3 rounded-xl bg-white/90 border border-border-sora space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-sora/70 flex items-center">
                        <Compass className="w-3.5 h-3.5 mr-1 text-primary-sora" />
                        Distancia desde Cocina Sora:
                      </span>
                      <span className="font-bold text-text-sora">
                        ~{feeEstimate.distanceKm} km (Aprox. {feeEstimate.estimatedMinutes} min en moto)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-sora/60 text-[11px]">
                        Tarifa sugerida:
                      </span>
                      <span className="font-semibold text-emerald-700 text-xs">
                        {formatCurrency(feeEstimate.suggestedFee)} ({feeEstimate.breakdown})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white/70 border border-border-sora text-[11px] text-text-sora/60">
                    📍 Coordenadas GPS no detectadas o Retiro en local. Puedes ajustar el costo de envío manualmente.
                  </div>
                )}

                {/* Selector / Ajuste del Costo de Envío */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-semibold text-text-sora/80">
                      Costo de Envío (DOP):
                    </label>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-2 text-xs text-text-sora/50 font-bold">
                        RD$
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="25"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full pl-9 pr-2 py-1.5 rounded-xl border border-border-sora bg-white text-xs font-bold text-text-sora text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary-sora"
                      />
                    </div>
                  </div>

                  {/* Botones rápidos de ajuste */}
                  <div className="flex items-center space-x-1.5">
                    {feeEstimate && (
                      <button
                        type="button"
                        onClick={() => setDeliveryFee(feeEstimate.suggestedFee)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-border-sora/30 border border-border-sora text-primary-sora transition-colors"
                        title="Usar tarifa calculada por GPS"
                      >
                        Sugerido ({feeEstimate.suggestedFee})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeliveryFee(0)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        deliveryFee === 0
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white hover:bg-border-sora/30 border-border-sora text-text-sora/70'
                      }`}
                    >
                      Gratis / Local (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFee((prev) => Math.max(0, prev - 25))}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-border-sora/30 border border-border-sora text-text-sora/70"
                    >
                      -25
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFee((prev) => prev + 25)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-border-sora/30 border border-border-sora text-text-sora/70"
                    >
                      +25
                    </button>
                  </div>
                </div>

                {/* Total Final */}
                <div className="pt-2 border-t border-primary-sora/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-sora uppercase tracking-wider block">
                      Total a Cobrar
                    </span>
                    <span className="text-[11px] text-text-sora/60">
                      Platos ({formatCurrency(subtotalDishes)}) + Envío ({formatCurrency(deliveryFee)})
                    </span>
                  </div>
                  <span className="font-serif text-2xl font-bold text-primary-sora">
                    {formatCurrency(totalCalculated)}
                  </span>
                </div>
              </div>

              {/* 6. MÉTODO Y ESTADO DE PAGO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === 'efectivo'
                          ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === 'transferencia'
                          ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Estado de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('pagado')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentStatus === 'pagado'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pagado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('cobrar_contra_entrega')}
                      className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentStatus === 'cobrar_contra_entrega'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Contra Entrega</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. ASIGNAR REPARTIDOR Y NOTAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                    Asignar Repartidor
                  </label>
                  {deliveryType === 'pickup' ? (
                    <div className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 text-emerald-800 text-xs font-semibold">
                      <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Retiro en Local (No requiere motorista)</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                        <Truck className="w-4 h-4" />
                      </div>
                      <select
                        value={deliveryUserId}
                        onChange={(e) => setDeliveryUserId(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora font-medium"
                      >
                        <option value="">-- Sin asignar por ahora --</option>
                        {deliveryDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider">
                    Notas de Cocina / Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Extra queso, sin salsa picante..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                  />
                </div>
              </div>

              {/* Botón de Enviar (Crear o Actualizar) */}
              <div className="flex items-center space-x-3 pt-2">
                {editingOrder && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-3.5 rounded-2xl border border-border-sora bg-white hover:bg-bg-sora text-text-sora font-semibold text-xs transition-all shadow-xs"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !currentClient}
                  className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2 text-white ${
                    editingOrder
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                      : 'bg-primary-sora hover:bg-primary-hover shadow-primary-sora/25'
                  }`}
                >
                  {editingOrder ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? 'Guardando cambios...'
                          : `Actualizar Pedido #${editingOrder.order_number}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 animate-bounce" />
                      <span>
                        {isSubmitting
                          ? 'Guardando pedido...'
                          : 'Guardar Pedido y Activar Timbre de Cocina 🔔'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: HISTORIAL DE PEDIDOS CON EDICIÓN Y BORRADO */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-border-sora shadow-sora">
              <div className="flex items-center justify-between pb-4 border-b border-border-sora mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-text-sora">
                    Historial de Pedidos
                  </h3>
                  <p className="text-xs text-text-sora/60">
                    {orders.length} pedidos registrados (Autoguardado activo)
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Pendientes: {orders.filter((o) => (o.status || '').toLowerCase() === 'pendiente').length}
                </span>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-3.5 max-h-[780px] overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const cleanPhone = cleanPhoneNumber(order.client_phone);
                    const orderFee = order.delivery_fee || 0;
                    const trackingOrigin =
                      typeof window !== 'undefined'
                        ? window.location.origin
                        : 'https://sora-cocina-casera-git-main-pppt1.vercel.app';
                    const trackingUrl = `${trackingOrigin}/rastreo/${order.order_number}`;

                    const whatsappMsg = encodeURIComponent(
                      `¡Hola ${order.client_name}! 🍲 Tu pedido #${order.order_number} en Sora Cocina Casera:\n\n` +
                        (order.items || [])
                          .map((it) => `• ${it.quantity}x ${it.name} (${formatCurrency(it.subtotal)})`)
                          .join('\n') +
                        (orderFee > 0 ? `\n🛵 Envío: ${formatCurrency(orderFee)}` : '') +
                        `\n💰 Total: ${formatCurrency(order.total)}` +
                        (order.delivery_time ? `\n⏰ Horario de entrega: ${order.delivery_time}` : '') +
                        `\n📍 Dirección: ${order.address}` +
                        `\n\n🛵 Sigue el estado de tu pedido en vivo aquí:\n👉 ${trackingUrl}` +
                        `\n\n¡Muchas gracias por elegir Sora!`
                    );

                    const isBeingEdited = editingOrder?.id === order.id;
                    const urgency = calculateOrderUrgency(order, currentTime);
                    const isFutureDay = Boolean(order.delivery_date && order.delivery_date > todayStr);

                    const futureWhatsAppMsg = encodeURIComponent(
                      `¡Hola ${order.client_name}! Te saludamos de Sora Cocina Casera 🍲.\n\n` +
                        `Te confirmamos con gusto tu pedido #${order.order_number} agendado para el ${order.delivery_date}${order.delivery_time ? ` a las ${order.delivery_time}` : ''}.\n\n` +
                        `• Platos:\n` +
                        (order.items || []).map((it) => `  - ${it.quantity}x ${it.name} (${formatCurrency(it.subtotal)})`).join('\n') +
                        (orderFee > 0 ? `\n• Envío a Domicilio: ${formatCurrency(orderFee)}` : order.delivery_user_name === 'Retiro en Local' || order.delivery_type === 'pickup' ? `\n• Modalidad: Retiro en Local Sora` : '') +
                        `\n• Total: ${formatCurrency(order.total)}` +
                        `\n\nTu orden está en nuestra agenda de horneado artesanal. ¿Todo listo para recibirlo? ¡Que pases un excelente día!`
                    );

                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                          isBeingEdited
                            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md bg-white'
                            : `${urgency.borderClass} ${urgency.bgTintClass} ${urgency.isBlinking ? 'shadow-md shadow-rose-500/10' : 'shadow-xs'}`
                        }`}
                      >
                        {/* Cabecera de la tarjeta con Semáforo y Estados Modernos */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-primary-sora bg-bg-sora px-2 py-0.5 rounded-md border border-border-sora">
                              {order.order_number}
                            </span>
                            <span className="text-xs font-bold text-text-sora">
                              {order.client_name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                            {/* Badge de Urgencia Semáforo */}
                            {urgency.urgencyLevel !== 'normal' && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center ${urgency.badgeClass}`}>
                                {urgency.badgeLabel}
                              </span>
                            )}

                            {/* Estado con Iconografía Renovada */}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase flex items-center space-x-1 ${
                                (order.status || '').toLowerCase() === 'entregado'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : (order.status || '').toLowerCase() === 'en preparacion'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                  : (order.status || '').toLowerCase() === 'en camino'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold'
                                  : (order.status || '').toLowerCase() === 'cancelado'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-bg-sora text-text-sora/80 border-border-sora'
                              }`}
                            >
                              {(order.status || '').toLowerCase() === 'en preparacion' && <Flame className="w-3 h-3 text-primary-sora inline mr-0.5" />}
                              {(order.status || '').toLowerCase() === 'en camino' && <Truck className="w-3 h-3 text-blue-600 inline mr-0.5" />}
                              {(order.status || '').toLowerCase() === 'entregado' && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-0.5" />}
                              {(order.status || '').toLowerCase() === 'cancelado' && <XCircle className="w-3 h-3 text-red-600 inline mr-0.5" />}
                              {(order.status || '').toLowerCase() === 'pendiente' && <Clock className="w-3 h-3 text-text-sora/60 inline mr-0.5" />}
                              <span>{order.status}</span>
                            </span>
                          </div>
                        </div>

                        {/* Horario y Fecha Prometida */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-sora/80">
                          {order.delivery_time ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Entrega: {order.delivery_time}{' '}
                              {order.delivery_date && order.delivery_date !== todayStr
                                ? `(${order.delivery_date.split('-').slice(1).join('/')})`
                                : '(Hoy)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] text-text-sora/60">
                              <Clock className="w-3 h-3 mr-1" />
                              Entrega inmediata
                            </span>
                          )}

                          {order.delivery_user_name === 'Retiro en Local' || order.delivery_type === 'pickup' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                              <Store className="w-3 h-3 mr-1" />
                              Retiro en Local
                            </span>
                          ) : order.delivery_user_name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-bg-sora text-text-sora/70 border border-border-sora text-[11px]">
                              <Truck className="w-3 h-3 mr-1" />
                              {order.delivery_user_name}
                            </span>
                          ) : null}
                        </div>

                        {/* Dirección */}
                        <div className="text-xs text-text-sora/70 space-y-1">
                          <p className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-primary-sora flex-shrink-0" />
                            <span className="truncate">{order.address}</span>
                          </p>
                        </div>

                        {/* Total, Envío y Estado de Pago */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-sora/60">
                          <div className="text-[11px]">
                            <span className="capitalize font-medium text-text-sora">
                              {order.payment_method} •{' '}
                            </span>
                            <span
                              className={
                                order.payment_status === 'pagado'
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-amber-600 font-semibold'
                              }
                            >
                              {order.payment_status === 'pagado' ? 'Pagado' : 'Contra entrega'}
                            </span>
                            {orderFee > 0 && (
                              <span className="block text-[10px] text-text-sora/50">
                                Incluye envío: {formatCurrency(orderFee)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary-sora font-mono">
                            {formatCurrency(parseFloat(order.total as any) || 0)}
                          </span>
                        </div>

                        {/* ACCIONES: EDITAR, CANCELAR, BORRAR Y WHATSAPP */}
                        <div className="pt-2 border-t border-border-sora/40 flex items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1">
                            {/* Botón Editar */}
                            <button
                              type="button"
                              onClick={() => handleEditOrder(order)}
                              className="p-1.5 rounded-xl border border-border-sora text-text-sora/70 hover:text-primary-sora hover:bg-primary-sora/10 text-xs font-semibold transition-colors flex items-center space-x-1"
                              title="Editar pedido"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Editar</span>
                            </button>

                            {/* Botón Cancelar Pedido (si no está cancelado) */}
                            {order.status !== 'Cancelado' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrderStatus(order.id, order.order_number)}
                                className="p-1.5 rounded-xl border border-border-sora text-text-sora/70 hover:text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors flex items-center space-x-1"
                                title="Marcar como cancelado"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Cancelar</span>
                              </button>
                            )}

                            {/* Botón Eliminar Permanente */}
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id, order.order_number)}
                              className="p-1.5 rounded-xl border border-border-sora text-text-sora/70 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center space-x-1"
                              title="Eliminar pedido permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Borrar</span>
                            </button>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {/* Link de Rastreo Público */}
                            <a
                              href={`/rastreo/${order.order_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-primary-sora/30 bg-primary-sora/5 hover:bg-primary-sora/15 text-primary-sora text-[11px] font-semibold transition-all shadow-2xs active:scale-95"
                              title="Ver pantalla de rastreo en vivo del cliente"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span>Rastreo</span>
                            </a>

                            {/* Notificación de WhatsApp / Recordatorio Futuro */}
                            {isFutureDay ? (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${futureWhatsAppMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all shadow-xs active:scale-95"
                                title="Enviar recordatorio de pedido futuro al cliente por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Recordar WhatsApp</span>
                              </a>
                            ) : (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-whatsapp hover:bg-[#20bd5a] text-white text-[11px] font-semibold transition-all shadow-xs active:scale-95"
                                title="Enviar resumen y link de rastreo por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-text-sora/50 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-text-sora/20" />
                  <p className="font-semibold text-text-sora/70">No hay pedidos registrados aún</p>
                  <p>Crea el primer pedido con el formulario de la izquierda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Gestión de Platos del Menú */}
      <MenuManagerModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        menuItems={menuItems}
        onSaveMenuItems={handleSaveMenuItems}
      />
    </AppNavigation>
  );
}
