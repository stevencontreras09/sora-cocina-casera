'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_INFO, UserRole, AppPermission } from '@/types/database.types';
import { SystemUpdateNotice } from './SystemUpdateNotice';
import { KitchenAlertBanner } from '@/components/alerts/KitchenAlertBanner';
import { AutoSaveStatusIndicator } from './AutoSaveStatusIndicator';
import { InstallAppModal } from './InstallAppModal';
import { CURRENT_APP_VERSION } from '@/lib/version';
import {
  LayoutDashboard,
  Receipt,
  Truck,
  LogOut,
  Menu,
  X,
  Users,
  ShoppingBag,
  BarChart3,
  ChefHat,
  User as UserIcon,
  Shield,
  UserCog,
  ShieldAlert,
  Download,
  Boxes,
  UtensilsCrossed,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  permissionKey: AppPermission;
  description: string;
}

const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['admin'],
    permissionKey: 'dashboard',
    description: 'Resumen gerencial y estadísticas',
  },
  {
    name: 'Ventas',
    href: '/ventas',
    icon: ShoppingBag,
    allowedRoles: ['admin'],
    permissionKey: 'ventas',
    description: 'Creación y despacho de pedidos',
  },
  {
    name: 'Clientes',
    href: '/clientes',
    icon: Users,
    allowedRoles: ['admin'],
    permissionKey: 'clientes',
    description: 'Directorio y geolocalización',
  },
  {
    name: 'Inventario',
    href: '/inventario',
    icon: Boxes,
    allowedRoles: ['admin', 'coadmin'],
    permissionKey: 'inventario',
    description: 'Control de stock y reorden',
  },
  {
    name: 'Platos & Recetas',
    href: '/platos',
    icon: UtensilsCrossed,
    allowedRoles: ['admin', 'coadmin'],
    permissionKey: 'platos',
    description: 'Catálogo de platos y ficha técnica de insumos',
  },
  {
    name: 'Gastos',
    href: '/gastos',
    icon: Receipt,
    allowedRoles: ['admin', 'coadmin'],
    permissionKey: 'gastos',
    description: 'Control de egresos e insumos',
  },
  {
    name: 'Delivery',
    href: '/delivery',
    icon: Truck,
    allowedRoles: ['admin', 'coadmin', 'delivery'],
    permissionKey: 'delivery',
    description: 'Despacho y rutas de entrega',
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    allowedRoles: ['admin'],
    permissionKey: 'reportes',
    description: 'Métricas financieras y utilidad',
  },
  {
    name: 'Usuarios',
    href: '/admin/usuarios',
    icon: UserCog,
    allowedRoles: ['admin'],
    permissionKey: 'usuarios',
    description: 'Control de accesos y roles',
  },
];

export function AppNavigation({ children }: { children: React.ReactNode }) {
  const { user, profile, role, signOut, isLoading, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  // Filtrar elementos de navegación basados en los permisos asignados al usuario
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    hasPermission(item.permissionKey)
  );

  const currentRoleInfo = role ? ROLE_INFO[role] : null;

  // 1. Bloqueo si la cuenta está desactivada
  const isDeactivated = Boolean(
    profile && (profile.is_active === false || (profile as any).active === false)
  );

  // 2. Comprobar si la ruta actual está permitida para este usuario
  const currentNavItem = NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  const isRouteAllowed =
    role === 'admin' ||
    !currentNavItem ||
    hasPermission(currentNavItem.permissionKey);

  // Auto-redirección si el usuario intenta acceder a una ruta que no tiene permitida
  useEffect(() => {
    if (!isLoading && profile && !isDeactivated && !isRouteAllowed && visibleItems.length > 0) {
      router.replace(visibleItems[0].href);
    }
  }, [isRouteAllowed, isDeactivated, isLoading, profile, visibleItems, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-sora flex flex-col lg:flex-row">
      {/* HEADER MÓVIL Y TABLET (IPAD VERTICAL) */}
      <header className="lg:hidden bg-bg-sora border-b border-border-sora px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md bg-bg-sora/95">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm border border-primary-sora/15 bg-white flex items-center justify-center flex-shrink-0">
            <img src="/logo.jpg" alt="Sora Cocina Casera" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-text-sora text-lg sm:text-xl tracking-tight leading-none">
              Sora
            </h1>
            <p className="text-[10px] text-text-sora/60 uppercase tracking-widest font-semibold mt-0.5">
              Cocina Casera
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <AutoSaveStatusIndicator />
          {currentRoleInfo && (
            <span
              className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRoleInfo.badgeColor}`}
            >
              <Shield className="w-3 h-3 mr-1" />
              {currentRoleInfo.label}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-text-sora hover:bg-border-sora/40 transition-colors"
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* MENÚ MÓVIL Y TABLET DESPLEGABLE */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[61px] bg-bg-sora/95 backdrop-blur-md z-20 flex flex-col justify-between p-6 overflow-y-auto border-b border-border-sora animate-in fade-in duration-150">
          <div className="space-y-6 max-w-lg mx-auto w-full">
            {/* Info usuario */}
            {profile && (
              <div className="p-4 rounded-2xl bg-white/80 border border-border-sora shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary-sora/15 text-primary-sora flex items-center justify-center font-bold text-base">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-sora truncate text-sm">
                      {profile.full_name || user?.email}
                    </p>
                    <p className="text-xs text-text-sora/60 truncate">{user?.email}</p>
                  </div>
                </div>
                {currentRoleInfo && (
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentRoleInfo.badgeColor}`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {currentRoleInfo.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Pestañas permitidas */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-sora/50 uppercase tracking-wider px-2">
                Menú Autorizado
              </p>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-primary-sora text-white shadow-md font-semibold'
                        : 'text-text-sora/80 hover:bg-border-sora/50 hover:text-text-sora bg-white/50 border border-border-sora/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm">{item.name}</span>
                      <span
                        className={`text-xs ${
                          isActive ? 'text-white/80' : 'text-text-sora/50'
                        }`}
                      >
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Botón cerrar sesión en móvil / tablet */}
          <div className="pt-6 border-t border-border-sora max-w-lg mx-auto w-full text-center">
            {/* Botón de Instalar App en Celular */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setInstallModalOpen(true);
              }}
              className="w-full mb-3 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-primary-sora/15 text-primary-sora hover:bg-primary-sora hover:text-white font-bold text-xs border border-primary-sora/30 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>📲 Instalar Sora en tu Teléfono</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-2xl text-primary-sora bg-primary-sora/10 hover:bg-primary-sora hover:text-white transition-all font-semibold text-sm disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </button>
            <span className="text-[10px] text-text-sora/40 font-mono mt-2.5 block">
              Sora Cocina Casera • v{CURRENT_APP_VERSION}
            </span>
          </div>
        </div>
      )}

      {/* BARRA LATERAL (PC Y IPAD HORIZONTAL) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/60 border-r border-border-sora sticky top-0 h-screen p-5 justify-between backdrop-blur-sm shadow-sm flex-shrink-0">
        <div>
          {/* Logo y Marca */}
          <div className="flex items-center space-x-3 pb-6 border-b border-border-sora">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-md shadow-primary-sora/15 border border-primary-sora/15 bg-white flex items-center justify-center flex-shrink-0">
              <img src="/logo.jpg" alt="Sora Cocina Casera" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-text-sora text-xl tracking-tight leading-none">
                Sora
              </h2>
              <p className="text-[11px] text-text-sora/60 uppercase tracking-widest font-semibold mt-0.5">
                Cocina Casera
              </p>
            </div>
          </div>

          {/* Perfil & Rol Activo */}
          <div className="my-5 p-3 rounded-xl bg-bg-sora/80 border border-border-sora">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary-sora/15 text-primary-sora flex items-center justify-center text-xs font-bold">
                {profile?.full_name?.charAt(0).toUpperCase() || (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-sora truncate">
                  {profile?.full_name || 'Personal Sora'}
                </p>
                <p className="text-[11px] text-text-sora/60 truncate">
                  {user?.email || 'Sesión activa'}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 flex-wrap">
              {currentRoleInfo && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${currentRoleInfo.badgeColor}`}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {currentRoleInfo.label}
                </span>
              )}
              <AutoSaveStatusIndicator />
            </div>
          </div>

          {/* Lista de Navegación Condicional por Rol */}
          <nav className="space-y-1">
            <p className="text-[11px] font-semibold text-text-sora/40 uppercase tracking-wider px-3 mb-2">
              Menú Principal
            </p>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-sora text-white shadow-sm'
                      : 'text-text-sora/70 hover:bg-border-sora/40 hover:text-text-sora'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: Botón Instalar y Cerrar Sesión */}
        <div className="pt-4 border-t border-border-sora text-center space-y-2">
          <button
            onClick={() => setInstallModalOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-primary-sora/10 hover:bg-primary-sora hover:text-white text-primary-sora transition-all text-xs font-bold border border-primary-sora/25 shadow-2xs group"
            title="Instalar Sora en tu computadora o laptop"
          >
            <Download className="w-3.5 h-3.5 group-hover:animate-bounce" />
            <span>Instalar Aplicación</span>
          </button>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-primary-sora hover:bg-primary-sora hover:text-white transition-all text-sm font-medium border border-primary-sora/20 disabled:opacity-50"
            title="Cerrar sesión en este dispositivo"
          >
            <LogOut className="w-4 h-4" />
            <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
          </button>
          <span className="text-[10px] text-text-sora/40 font-mono mt-1 block">
            Sora Cocina Casera • v{CURRENT_APP_VERSION}
          </span>
        </div>
      </aside>

      {/* MODAL DE INSTALACIÓN ASISTIDA (PWA PARA IOS, ANDROID, PC Y MAC) */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />

      {/* CONTENIDO PRINCIPAL CON PROTECCIÓN EN TIEMPO REAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        <SystemUpdateNotice />
        <KitchenAlertBanner />
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {isDeactivated ? (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-text-sora">
                Cuenta Desactivada
              </h2>
              <p className="text-xs text-text-sora/70 leading-relaxed">
                Esta cuenta ha sido desactivada por el Administrador. No tienes acceso a los módulos ni a las funciones de Sora Cocina Casera.
              </p>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-6 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm transition-all"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : !isRouteAllowed ? (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-text-sora">
                Acceso No Autorizado
              </h2>
              <p className="text-xs text-text-sora/70 leading-relaxed">
                No tienes permisos configurados para acceder a{' '}
                <strong>{currentNavItem?.name || 'este módulo'}</strong>.
              </p>
              {visibleItems.length > 0 && (
                <button
                  onClick={() => router.replace(visibleItems[0].href)}
                  className="px-6 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm transition-all"
                >
                  Ir a {visibleItems[0].name}
                </button>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
