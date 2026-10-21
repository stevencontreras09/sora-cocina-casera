'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole, ROLE_INFO, AppPermission, DEFAULT_ROLE_PERMISSIONS } from '@/types/database.types';
import { getStoredUserPermissions } from '@/lib/storage';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: AppPermission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = async (currentUser: User) => {
    try {
      // Consultar perfil directamente en Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Advertencia al consultar perfil:', error.message);
      }

      // Permisos cacheados localmente como respaldo
      const localPerms =
        getStoredUserPermissions(currentUser.id) ||
        (currentUser.email ? getStoredUserPermissions(currentUser.email) : null);

      if (data) {
        const loadedProfile = data as Profile;

        // Bloqueo de seguridad: si la cuenta está inactiva, forzar cierre de sesión inmediato
        if (loadedProfile.is_active === false || (loadedProfile as any).active === false) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          if (typeof window !== 'undefined') {
            window.location.href = '/login?error=deactivated';
          }
          return;
        }
        
        // Prioridad 1: Permisos explícitos en Supabase
        if (loadedProfile.permissions && Array.isArray(loadedProfile.permissions) && loadedProfile.permissions.length > 0) {
          // Mantener sincronizado el almacenamiento local y cookies con Supabase
          try {
            const jsonPerms = JSON.stringify(loadedProfile.permissions);
            const cleanId = currentUser.id.toLowerCase().trim();
            localStorage.setItem(`sora_perms_${cleanId}`, jsonPerms);
            document.cookie = `sora_perms_${cleanId}=${encodeURIComponent(jsonPerms)}; path=/; max-age=2592000; SameSite=Lax`;
            if (currentUser.email) {
              const cleanEmail = currentUser.email.toLowerCase().trim();
              localStorage.setItem(`sora_perms_${cleanEmail}`, jsonPerms);
              document.cookie = `sora_perms_${cleanEmail}=${encodeURIComponent(jsonPerms)}; path=/; max-age=2592000; SameSite=Lax`;
            }
          } catch (_) {}
        } else if (localPerms && localPerms.length > 0) {
          // Prioridad 2: Respaldo local
          loadedProfile.permissions = localPerms as AppPermission[];
        } else {
          // Prioridad 3: Permisos predeterminados del rol
          loadedProfile.permissions = DEFAULT_ROLE_PERMISSIONS[loadedProfile.role] || [];
        }

        setProfile(loadedProfile);
      } else {
        // Si aún no existe fila en 'profiles', creamos un estado provisional con metadata
        const fallbackRole = (currentUser.user_metadata?.role as UserRole) || 'admin';
        const effectivePerms =
          (localPerms as AppPermission[]) ||
          DEFAULT_ROLE_PERMISSIONS[fallbackRole] ||
          [];

        setProfile({
          id: currentUser.id,
          email: currentUser.email || null,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario Sora',
          role: fallbackRole,
          permissions: effectivePerms,
        });
      }
    } catch (err) {
      console.error('Error al obtener perfil:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    let profileChannel: any = null;

    const setupRealtimeSubscription = (targetUser: User) => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      profileChannel = supabase
        .channel(`public:profiles:${targetUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${targetUser.id}`,
          },
          () => {
            if (mounted) {
              fetchProfile(targetUser);
            }
          }
        )
        .subscribe();
    };

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
          setupRealtimeSubscription(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error inicializando autenticación:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
        setupRealtimeSubscription(session.user);
      } else {
        setUser(null);
        setProfile(null);
        if (profileChannel) {
          supabase.removeChannel(profileChannel);
          profileChannel = null;
        }
      }

      setIsLoading(false);

      if (event === 'SIGNED_OUT') {
        router.push('/login');
        router.refresh();
      }
    });

    const handleUserUpdate = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && mounted) {
          fetchProfile(session.user);
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleUserUpdate();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sora-user-updated', handleUserUpdate);
      window.addEventListener('storage', handleUserUpdate);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('sora-user-updated', handleUserUpdate);
        window.removeEventListener('storage', handleUserUpdate);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [supabase, router]);

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    router.push('/login');
    router.refresh();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const role = profile?.role || null;

  const hasPermission = (permission: AppPermission): boolean => {
    if (!profile) return false;
    // Administrador siempre tiene acceso total a todas las funciones
    if (profile.role === 'admin') return true;
    // Si tiene un listado de permisos granulares configurados
    if (profile.permissions && Array.isArray(profile.permissions) && profile.permissions.length > 0) {
      return profile.permissions.includes(permission);
    }
    // Fallback a los accesos predeterminados del rol
    const defaults = DEFAULT_ROLE_PERMISSIONS[profile.role] || [];
    return defaults.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        signOut,
        refreshProfile,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
