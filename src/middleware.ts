import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { ROLE_INFO, UserRole } from '@/types/database.types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar peticiones a archivos estáticos, api interna o favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Refrescar sesión de Supabase y obtener rol y estado activo
  const { supabaseResponse, user, role, isActive } = await updateSession(request);

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
      // Redirigir a login conservando la URL de destino si se desea
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

  // 3. Si el usuario autenticado entra a /login o a la raíz /, redirigir según su rol
  if (isLoginPage || pathname === '/') {
    const redirectUrl = new URL(roleConfig.defaultRoute, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Protección por rol de rutas privadas
  // Admin tiene acceso a todo: /dashboard, /gastos, /delivery
  // Coadmin tiene acceso a: /gastos, /delivery
  // Delivery tiene acceso exclusivo a: /delivery
  const isAllowed = roleConfig.allowedRoutes.some((allowed) =>
    pathname.startsWith(allowed)
  );

  if (!isAllowed) {
    // Si intenta acceder a una ruta no permitida para su rol, redirigir a su ruta por defecto
    const redirectUrl = new URL(roleConfig.defaultRoute, request.url);
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
