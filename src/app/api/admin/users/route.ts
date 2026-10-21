import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, is_active, permissions, full_name, email } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    // Verificar que el usuario que hace la petición esté autenticado en Supabase
    const { user, role: callerRole } = await updateSession(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo un usuario autenticado con rol admin puede gestionar cuentas
    if (callerRole !== 'admin') {
      return NextResponse.json(
        { error: 'Se requiere rol Administrador para gestionar usuarios' },
        { status: 403 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Variables de entorno de Supabase no configuradas' },
        { status: 500 }
      );
    }

    // Cliente directo sin heredar el JWT del admin para que no sea restringido por RLS (auth.uid() = id)
    const directClient = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const activeState = is_active !== false;
    const updatePayload: Record<string, any> = {
      role: role || 'delivery',
      is_active: activeState,
      active: activeState,
      permissions: Array.isArray(permissions) ? permissions : [],
    };
    if (full_name) updatePayload.full_name = full_name;
    if (email) updatePayload.email = email;

    // Actualizar fila existente
    const { data, error } = await directClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error al actualizar perfil en DB:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si la fila no existía previamente, insertar
    if (!data || data.length === 0) {
      const { data: upsertData, error: upsertErr } = await directClient
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: full_name || (email ? email.split('@')[0] : 'Usuario'),
          ...updatePayload,
        })
        .select();

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, profile: upsertData?.[0] });
    }

    return NextResponse.json({ success: true, profile: data[0] });
  } catch (err: any) {
    console.error('Error no controlado en /api/admin/users:', err);
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const { user, role: callerRole } = await updateSession(request);
    if (!user || callerRole !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Por seguridad no puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const directClient = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await directClient.from('profiles').delete().eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
