import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { ROLE_INFO, UserRole, DEFAULT_ROLE_PERMISSIONS, AppPermission } from '@/types/database.types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar peticiones a archivos estáticos, api interna, favicon o link público de rastreo
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/rastreo') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Refrescar sesión de Supabase y obtener rol, estado activo y permisos
  const { supabaseResponse, user, role, isActive, permissions } = await updateSession(request);

  const isLoginPage = pathname === '/login';

  // Si la cuenta está inactiva, bloquear acceso y enviar a login con advertencia
  if (user && isActive === false && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'deactivated');
    return NextResponse.redirect(loginUrl);
  }

  // 1. Si no está autenticado y no está en /login, redirigir a /login
  if (!user) {
    if (!isLoginPage) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // 2. Si el usuario está autenticado pero no tiene rol asignado aún, asumir 'admin' o mantener en espera
  const effectiveRole: UserRole = role || 'admin';
  const roleConfig = ROLE_INFO[effectiveRole] || ROLE_INFO.admin;

  // Mapa de funciones a rutas
  const PERMISSION_ROUTES: Record<string, string> = {
    dashboard: '/dashboard',
    ventas: '/ventas',
    clientes: '/clientes',
    gastos: '/gastos',
    delivery: '/delivery',
    reportes: '/reportes',
    usuarios: '/admin',
  };

  // Construir rutas permitidas totales según permisos granulares o rol
  const allowedRoutePrefixes = new Set<string>();

  // Obtener permisos del usuario:
  // 1) Desde base de datos (profiles.permissions)
  // 2) De cookies de sesión sincronizadas
  // 3) Fallback a los permisos predeterminados del rol
  let userPerms = permissions;
  if (!userPerms || userPerms.length === 0) {
    const cleanId = user.id.toLowerCase().trim();
    const cookiePerms =
      request.cookies.get(`sora_perms_${cleanId}`)?.value ||
      request.cookies.get(`sora_perms_${user.id}`)?.value ||
      (user.email ? request.cookies.get(`sora_perms_${user.email.toLowerCase().trim()}`)?.value : null);
    if (cookiePerms) {
      try {
        userPerms = JSON.parse(decodeURIComponent(cookiePerms));
      } catch (_) {}
    }
  }

  const effectivePermissions =
    userPerms && Array.isArray(userPerms) && userPerms.length > 0
      ? (userPerms as AppPermission[])
      : DEFAULT_ROLE_PERMISSIONS[effectiveRole] || [];

  if (effectiveRole === 'admin') {
    Object.values(PERMISSION_ROUTES).forEach((r) => allowedRoutePrefixes.add(r));
  } else {
    effectivePermissions.forEach((perm) => {
      if (PERMISSION_ROUTES[perm]) {
        allowedRoutePrefixes.add(PERMISSION_ROUTES[perm]);
      }
    });
  }

  // Determinar ruta de aterrizaje óptima
  let defaultDestination = roleConfig.defaultRoute;
  if (!allowedRoutePrefixes.has(defaultDestination)) {
    const firstAllowed = Array.from(allowedRoutePrefixes)[0];
    if (firstAllowed) defaultDestination = firstAllowed;
  }

  // 3. Si el usuario autenticado entra a /login o a la raíz /, redirigir según permisos
  if (isLoginPage || pathname === '/') {
    const redirectUrl = new URL(defaultDestination, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Protección de rutas privadas
  const isAllowed =
    effectiveRole === 'admin' ||
    Array.from(allowedRoutePrefixes).some((allowed) =>
      pathname.startsWith(allowed)
    );

  if (!isAllowed) {
    // Si intenta acceder a una ruta no permitida para sus funciones, redirigir a su ruta permitida
    const redirectUrl = new URL(defaultDestination, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
