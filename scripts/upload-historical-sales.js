const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const historicalSales = [
  // Página 1 (Items 3 a 15)
  {
    num: 'HIST-001',
    date: '2026-10-08',
    items: [{ id: 'h-1', name: 'Lasaña Casera Mixta (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-002',
    date: '2026-10-09',
    items: [{ id: 'h-2', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-003',
    date: '2026-10-08',
    items: [{ id: 'h-3', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-004',
    date: '2026-10-08',
    items: [{ id: 'h-4', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-005',
    date: '2026-10-09',
    items: [{ id: 'h-5', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-006',
    date: '2026-10-08',
    items: [
      { id: 'h-6a', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 },
      { id: 'h-6b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 700
  },
  {
    num: 'HIST-007',
    date: '2026-10-08',
    items: [
      { id: 'h-7a', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 },
      { id: 'h-7b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 700
  },
  {
    num: 'HIST-008',
    date: '2026-10-08',
    items: [{ id: 'h-8', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 2, price: 350, subtotal: 700 }],
    total: 700
  },
  {
    num: 'HIST-009',
    date: '2026-10-09',
    items: [{ id: 'h-9', name: 'Lasaña Casera de Res (1 lb)', quantity: 4, price: 350, subtotal: 1400 }],
    total: 1400
  },
  {
    num: 'HIST-010',
    date: '2026-10-09',
    items: [{ id: 'h-10', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-011',
    date: '2026-10-08',
    items: [{ id: 'h-11', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-012',
    date: '2026-10-08',
    items: [{ id: 'h-12', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-013',
    date: '2026-10-09',
    items: [
      { id: 'h-13a', name: 'Lasaña Casera de Pollo (2 lb)', quantity: 1, price: 700, subtotal: 700 },
      { id: 'h-13b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 1050
  },

  // Página 2 (Items 16 a 32)
  {
    num: 'HIST-014',
    date: '2026-10-09',
    items: [{ id: 'h-14', name: 'Lasaña Casera de Pollo (2 lb)', quantity: 1, price: 700, subtotal: 700 }],
    total: 700
  },
  {
    num: 'HIST-015',
    date: '2026-10-09',
    items: [{ id: 'h-15', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-016',
    date: '2026-10-09',
    items: [{ id: 'h-16', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-017',
    date: '2026-10-09',
    items: [{ id: 'h-17', name: 'Lasaña Casera de Res (2 lb)', quantity: 1, price: 700, subtotal: 700 }],
    total: 700
  },
  {
    num: 'HIST-018',
    date: '2026-10-09',
    items: [{ id: 'h-18', name: 'Lasaña Casera Mixta (1 lb)', quantity: 2, price: 350, subtotal: 700 }],
    total: 700
  },
  {
    num: 'HIST-019',
    date: '2026-10-09',
    items: [{ id: 'h-19', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-020',
    date: '2026-10-09',
    items: [{ id: 'h-20', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-021',
    date: '2026-10-09',
    items: [{ id: 'h-21', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-022',
    date: '2026-10-12',
    items: [{ id: 'h-22', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-023',
    date: '2026-10-13',
    items: [{ id: 'h-23', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-024',
    date: '2026-10-13',
    items: [{ id: 'h-24', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-025',
    date: '2026-10-13',
    items: [{ id: 'h-25', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-026',
    date: '2026-10-13',
    items: [{ id: 'h-26', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-027',
    date: '2026-10-14',
    items: [{ id: 'h-27', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-028',
    date: '2026-10-12',
    items: [{ id: 'h-28', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-029',
    date: '2026-10-18',
    items: [{ id: 'h-29', name: 'Lasaña Casera de Pollo (2 lb)', quantity: 1, price: 700, subtotal: 700 }],
    total: 700
  },
  {
    num: 'HIST-030',
    date: '2026-10-18',
    items: [{ id: 'h-30', name: 'Lasaña Casera de Pollo (2 lb)', quantity: 1, price: 700, subtotal: 700 }],
    total: 700
  },

  // Página 3 (Items 33 a 44)
  {
    num: 'HIST-031',
    date: '2026-10-09',
    // 4 de 2lb pollo con descuento familiar RD$ 600 c/u
    items: [{ id: 'h-31', name: 'Lasaña Casera de Pollo (2 lb) [Tarifa Familiar]', quantity: 4, price: 600, subtotal: 2400 }],
    total: 2400
  },
  {
    num: 'HIST-032',
    date: '2026-10-09',
    // 1lb pollo con descuento familiar RD$ 300
    items: [{ id: 'h-32', name: 'Lasaña Casera de Pollo (1 lb) [Tarifa Familiar]', quantity: 1, price: 300, subtotal: 300 }],
    total: 300
  },
  {
    num: 'HIST-033',
    date: '2026-10-10',
    items: [
      { id: 'h-33a', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 },
      { id: 'h-33b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 700
  },
  {
    num: 'HIST-034',
    date: '2026-10-15',
    items: [{ id: 'h-34', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-035',
    date: '2026-10-16',
    items: [{ id: 'h-35', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-036',
    date: '2026-10-16',
    // 4lb = 2lb res + 1lb res + 1lb pollo
    items: [
      { id: 'h-36a', name: 'Lasaña Casera de Res (2 lb)', quantity: 1, price: 700, subtotal: 700 },
      { id: 'h-36b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 },
      { id: 'h-36c', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 1400
  },
  {
    num: 'HIST-037',
    date: '2026-10-16',
    items: [{ id: 'h-37', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-038',
    date: '2026-10-16',
    items: [{ id: 'h-38', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-039',
    date: '2026-10-16',
    items: [{ id: 'h-39', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-040',
    date: '2026-10-16',
    items: [
      { id: 'h-40a', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 },
      { id: 'h-40b', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }
    ],
    total: 700
  },
  {
    num: 'HIST-041',
    date: '2026-10-16',
    items: [{ id: 'h-41', name: 'Lasaña Casera de Pollo (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  },
  {
    num: 'HIST-042',
    date: '2026-10-16',
    items: [{ id: 'h-42', name: 'Lasaña Casera de Res (1 lb)', quantity: 1, price: 350, subtotal: 350 }],
    total: 350
  }
];

async function run() {
  console.log(`Procesando ${historicalSales.length} ventas confirmadas...`);
  let totalGrand = 0;
  historicalSales.forEach(s => totalGrand += s.total);
  console.log(`Monto Total de Ventas a subir: RD$ ${totalGrand.toLocaleString('en-US')}`);

  // Verificar si ya existen órdenes con prefijo HIST-
  const { data: existing } = await supabase.from('orders').select('order_number').ilike('order_number', 'HIST-%');
  const existingSet = new Set((existing || []).map(e => e.order_number));
  console.log(`Órdenes históricas ya existentes en Supabase: ${existingSet.size}`);

  const toInsert = [];
  for (const s of historicalSales) {
    if (existingSet.has(s.num)) {
      console.log(`Saltando ${s.num} (ya existe)`);
      continue;
    }

    const orderId = crypto.randomUUID();
    // Hora simulada acorde al día
    const createdTimestamp = `${s.date}T13:30:00.000Z`;

    toInsert.push({
      id: orderId,
      order_number: s.num,
      client_name: 'Venta Mostrador',
      client_phone: 'N/A',
      address: 'Retiro en Local (Cocina Sora)',
      address_label: 'Retiro en Local',
      items: s.items,
      total: s.total,
      payment_method: 'efectivo',
      payment_status: 'pagado',
      status: 'Entregado',
      delivery_date: s.date,
      created_at: createdTimestamp,
      updated_at: createdTimestamp
    });
  }

  if (toInsert.length > 0) {
    console.log(`Insertando ${toInsert.length} órdenes en Supabase...`);
    const { data, error } = await supabase.from('orders').insert(toInsert);
    if (error) {
      console.error('Error insertando en Supabase:', error);
      process.exit(1);
    }
    console.log(`¡Éxito! Se insertaron ${toInsert.length} órdenes históricas en Supabase.`);
  } else {
    console.log('No hay órdenes nuevas que insertar.');
  }

  // Guardar también en archivo local para sincronización con caché del navegador
  fs.writeFileSync('scripts/uploaded-historical-orders.json', JSON.stringify(toInsert, null, 2));
  console.log('Guardado en scripts/uploaded-historical-orders.json');
}

run();
