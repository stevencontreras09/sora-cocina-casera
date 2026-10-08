export type UserRole = 'admin' | 'coadmin' | 'delivery';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  phone?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ExpenseCategory =
  | 'insumos'
  | 'empaques'
  | 'transporte'
  | 'servicios'
  | 'nomina'
  | 'otros';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export type PaymentMethod = 'efectivo' | 'transferencia';
export type PaymentStatus = 'pagado' | 'cobrar_contra_entrega';
export type OrderStatus =
  | 'pendiente'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'
  | 'Pendiente'
  | 'En Preparacion'
  | 'En Camino'
  | 'Entregado'
  | 'Cancelado';

export interface DeliveryOrder {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  items_summary: string;
  total: number;
  status: 'pendiente' | 'en_camino' | 'entregado' | 'cancelado';
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  address_id?: string;
  address_label?: string;
  address: string;
  address_reference?: string;
  latitude?: number | null;
  longitude?: number | null;
  items: OrderItem[];
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_user_id?: string | null;
  delivery_user_name?: string | null;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClientAddress {
  id: string;
  client_id: string;
  label: string;
  address: string;
  reference?: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  addresses?: ClientAddress[];
}

export const ROLE_INFO: Record<
  UserRole,
  {
    label: string;
    description: string;
    defaultRoute: string;
    allowedRoutes: string[];
    badgeColor: string;
  }
> = {
  admin: {
    label: 'Administrador',
    description: 'Acceso total al sistema',
    defaultRoute: '/dashboard',
    allowedRoutes: [
      '/dashboard',
      '/ventas',
      '/clientes',
      '/gastos',
      '/delivery',
      '/reportes',
      '/admin',
      '/admin/usuarios',
    ],
    badgeColor: 'bg-primary-sora/15 text-primary-sora border-primary-sora/30',
  },
  coadmin: {
    label: 'Co-Administrador',
    description: 'Gestión de gastos y despacho de delivery',
    defaultRoute: '/gastos',
    allowedRoutes: ['/gastos', '/delivery'],
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300', // Azul suave
  },
  delivery: {
    label: 'Repartidor',
    description: 'Vista móvil de entregas',
    defaultRoute: '/delivery',
    allowedRoutes: ['/delivery'],
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300', // Verde
  },
};
