import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabaseResponse, user: null, role: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Supabase recomienda getUser() para verificación segura en el servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  let isActive: boolean = true;
  let permissions: string[] | null = null;

  if (user) {
    // Consultar el rol, estado activo y permisos en la tabla 'profiles'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      role = (profile.role as UserRole) || null;
      if (profile.is_active === false) {
        isActive = false;
      }
      if (Array.isArray(profile.permissions)) {
        permissions = profile.permissions;
      }
    } else if (user.user_metadata?.role) {
      // Fallback a metadata en caso de que el trigger aún no haya creado el perfil
      role = user.user_metadata.role as UserRole;
    }
  }

  return { supabaseResponse, user, role, isActive, permissions };
}
