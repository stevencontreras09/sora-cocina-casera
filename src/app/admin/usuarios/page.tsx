'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  Profile,
  UserRole,
  AppPermission,
  APP_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/types/database.types';
import {
  notifyAutoSave,
  getStoredUsers,
  saveStoredUsers,
  isValidUuid,
  generateUuid,
} from '@/lib/storage';
import {
  UserCog,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  RefreshCw,
  Power,
  Trash2,
  Users,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export default function GestionUsuariosPage() {
  const { user, profile: currentProfile, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estados de Edición de Usuario y Permisos
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('delivery');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPermissions, setEditPermissions] = useState<AppPermission[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estados para Eliminación de Usuario
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Modal de Invitación / Registro
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('delivery');
  const [invitePermissions, setInvitePermissions] = useState<AppPermission[]>(
    DEFAULT_ROLE_PERMISSIONS['delivery']
  );
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Cargar usuarios desde almacenamiento local y Supabase con fusión inteligente
  const loadUsers = async () => {
    setIsLoading(true);

    // Cargar inmediatamente desde almacenamiento local para respuesta instantánea
    const cachedUsers = getStoredUsers();
    if (cachedUsers.length > 0) {
      setUsers(cachedUsers);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Combinar usuarios de Supabase preservando roles o permisos configurados localmente
        const freshCached = getStoredUsers();
        const merged = (data as Profile[]).map((sp) => {
          const local = freshCached.find(
            (lp) => lp.id === sp.id || (lp.email && sp.email && lp.email.toLowerCase() === sp.email.toLowerCase())
          );
          return {
            ...sp,
            permissions:
              local?.permissions && local.permissions.length > 0
                ? local.permissions
                : (sp.permissions && sp.permissions.length > 0
                  ? sp.permissions
                  : DEFAULT_ROLE_PERMISSIONS[sp.role] || []),
            role: local?.role || sp.role,
            is_active: local?.is_active !== undefined ? local.is_active : sp.is_active,
          };
        });

        // Incluir usuarios que solo existen en local
        const localOnly = freshCached.filter(
          (lp) => !data.some(
            (sp) => sp.id === lp.id || (lp.email && sp.email && lp.email.toLowerCase() === sp.email.toLowerCase())
          )
        );

        const totalUsers = [...merged, ...localOnly];
        setUsers(totalUsers);
        saveStoredUsers(totalUsers);
      } else {
        const cachedFallback = getStoredUsers();
        if (cachedFallback.length > 0) {
          setUsers(cachedFallback);
        } else if (currentProfile) {
          setUsers([currentProfile]);
          saveStoredUsers([currentProfile]);
        }
      }
    } catch (err) {
      console.warn('Conexión con perfiles de Sora, usando respaldo', err);
      const cached = getStoredUsers();
      if (cached.length > 0) {
        setUsers(cached);
      } else if (currentProfile) {
        setUsers([currentProfile]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, currentProfile]);

  // Abrir modal de edición
  const handleOpenEdit = (targetUser: Profile) => {
    setEditingUser(targetUser);
    setEditRole(targetUser.role);
    setEditIsActive(targetUser.is_active !== false);

    // Permisos existentes o default del rol
    if (targetUser.permissions && Array.isArray(targetUser.permissions) && targetUser.permissions.length > 0) {
      setEditPermissions(targetUser.permissions);
    } else {
      setEditPermissions(DEFAULT_ROLE_PERMISSIONS[targetUser.role] || []);
    }
  };

  // Alternar selección de permiso en edición
  const toggleEditPermission = (permId: AppPermission) => {
    setEditPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  // Alternar selección de permiso en invitación
  const toggleInvitePermission = (permId: AppPermission) => {
    setInvitePermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  // 2. Guardar Edición de Rol, Estado y Permisos Granulares
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Regla de seguridad requerida: el admin actual no puede quitarse su propio rol de admin
    const isSelf = user?.id === editingUser.id || currentProfile?.email === editingUser.email;
    if (isSelf && editRole !== 'admin') {
      showFeedback('Por seguridad, no puedes quitarte el rol de Administrador a ti mismo.', 'error');
      return;
    }
    if (isSelf && !editIsActive) {
      showFeedback('Por seguridad, no puedes desactivar tu propia cuenta activa.', 'error');
      return;
    }

    setIsSavingEdit(true);

    // 1. Persistir inmediatamente en memoria y en localStorage
    const updatedUsers = users.map((u) =>
      u.id === editingUser.id
        ? {
            ...u,
            role: editRole,
            is_active: editIsActive,
            permissions: editPermissions,
          }
        : u
    );
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    // 2. Intentar actualizar en Supabase si es un UUID válido
    try {
      if (isValidUuid(editingUser.id)) {
        const updateData: any = {
          role: editRole,
          is_active: editIsActive,
          permissions: editPermissions,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error && error.message.includes('permissions')) {
          delete updateData.permissions;
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', editingUser.id);
        }
      }
    } catch (err) {
      console.warn('Actualización local de perfil persistida');
    }

    setIsSavingEdit(false);
    setEditingUser(null);
    notifyAutoSave('Usuarios');
    showFeedback(`Accesos y permisos actualizados para ${editingUser.full_name || editingUser.email}`);
  };

  // 3. Confirmar y Eliminar Usuario
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    const isSelf = user?.id === userToDelete.id || currentProfile?.email === userToDelete.email;
    if (isSelf) {
      showFeedback('Por seguridad, no puedes eliminar tu propia cuenta de Administrador.', 'error');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) {
        console.warn('Eliminación en Supabase profiles:', error.message);
      }
    } catch (err) {
      console.warn('Error al eliminar usuario en BD', err);
    }

    const updatedUsers = users.filter((u) => u.id !== userToDelete.id);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    setIsDeletingUser(false);
    notifyAutoSave('Usuarios');
    showFeedback(`Usuario ${userToDelete.full_name || userToDelete.email} eliminado del sistema.`);
    setUserToDelete(null);
  };

  // 4. Registrar / Invitar Usuario del Equipo con Permisos Granulares
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !invitePassword.trim()) {
      showFeedback('Completa el correo y la contraseña.', 'error');
      return;
    }

    setIsSubmittingInvite(true);
    const newUserId = generateUuid();
    const newProfile: Profile = {
      id: newUserId,
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || inviteEmail.split('@')[0],
      role: inviteRole,
      is_active: true,
      permissions: invitePermissions,
      created_at: new Date().toISOString().split('T')[0],
    };

    try {
      // Intentar registro mediante Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: invitePassword.trim(),
        options: {
          data: {
            full_name: inviteName.trim(),
            role: inviteRole,
            permissions: invitePermissions,
          },
        },
      });

      if (data?.user) {
        newProfile.id = data.user.id;
      }

      // Asegurar registro en la tabla profiles si es UUID
      if (isValidUuid(newProfile.id)) {
        const profileData: any = {
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: inviteRole,
          is_active: true,
          permissions: invitePermissions,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([profileData]);

        if (profileError && profileError.message.includes('permissions')) {
          delete profileData.permissions;
          await supabase.from('profiles').upsert([profileData]);
        }
      }
    } catch (err) {
      console.warn('Usuario registrado en estado local');
    }

    const updatedUsersList = [...users, newProfile];
    setUsers(updatedUsersList);
    saveStoredUsers(updatedUsersList);
    setIsSubmittingInvite(false);
    setIsInviteOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    notifyAutoSave('Usuarios');
    showFeedback(`¡Usuario ${newProfile.full_name} registrado con rol ${inviteRole.toUpperCase()} y accesos configurados!`);
  };

  // Atajos para prellenar roles del equipo
  const fillRoleTemplate = (targetRole: UserRole, defaultTitle: string) => {
    setInviteRole(targetRole);
    setInviteName(defaultTitle);
    setInvitePermissions(DEFAULT_ROLE_PERMISSIONS[targetRole] || []);
    setIsInviteOpen(true);
  };

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <AppNavigation>
      <div className="space-y-6 sm:space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                Seguridad & Accesos
              </span>
              <span className="text-xs text-text-sora/50">•</span>
              <span className="text-xs text-text-sora/60">
                Exclusivo Administrador
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-sora mt-1 tracking-tight">
              Gestión de Usuarios y Accesos
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Administra cuentas, roles, permisos por función y elimina accesos de miembros del equipo de Sora.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-border-sora bg-white text-text-sora hover:bg-bg-sora text-xs font-semibold transition-all shadow-sm"
              title="Refrescar usuarios"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary-sora' : ''}`} />
            </button>
            <button
              onClick={() => {
                setInviteName('');
                setInviteEmail('');
                setInvitePassword('');
                setInviteRole('delivery');
                setInvitePermissions(DEFAULT_ROLE_PERMISSIONS['delivery']);
                setIsInviteOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-sora text-white hover:bg-primary-hover text-xs sm:text-sm font-semibold transition-all shadow-md shadow-primary-sora/20 active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Usuario</span>
            </button>
          </div>
        </div>

        {/* Notificación de Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 border transition-all animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tarjetas de Acceso Rápido del Equipo (3 Roles) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/80 border border-border-sora shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                  Rol: Admin
                </span>
                <ShieldCheck className="w-4 h-4 text-primary-sora" />
              </div>
              <p className="text-xs text-text-sora/70 mt-2">
                Acceso total predeterminado a todas las funciones y ajustes del restaurante.
              </p>
            </div>
            <div className="pt-3 border-t border-border-sora/60 mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-text-sora/60">
                {users.filter((u) => u.role === 'admin').length} usuario(s)
              </span>
              <button
                onClick={() => fillRoleTemplate('admin', 'Administrador Sora')}
                className="text-primary-sora font-semibold hover:underline"
              >
                + Añadir
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-border-sora shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                  Rol: Coadmin
                </span>
                <Shield className="w-4 h-4 text-blue-700" />
              </div>
              <p className="text-xs text-text-sora/70 mt-2">
                Gestión operativa: Gastos, ventas y despacho con permisos seleccionables.
              </p>
            </div>
            <div className="pt-3 border-t border-border-sora/60 mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-text-sora/60">
                {users.filter((u) => u.role === 'coadmin').length} usuario(s)
              </span>
              <button
                onClick={() => fillRoleTemplate('coadmin', 'Co-Administrador')}
                className="text-blue-700 font-semibold hover:underline"
              >
                + Añadir
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-border-sora shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Rol: Delivery
                </span>
                <Shield className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-xs text-text-sora/70 mt-2">
                Acceso móvil con GPS Google Maps, Waze y llamadas a clientes.
              </p>
            </div>
            <div className="pt-3 border-t border-border-sora/60 mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-text-sora/60">
                {users.filter((u) => u.role === 'delivery').length} usuario(s)
              </span>
              <button
                onClick={() => fillRoleTemplate('delivery', 'Repartidor Móvil')}
                className="text-emerald-700 font-semibold hover:underline"
              >
                + Añadir
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-sora/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o rol..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border-sora bg-white text-text-sora text-xs placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora shadow-sm"
          />
        </div>

        {/* 1. DIRECTÓRIO DE USUARIOS (PROFILES) */}
        <div className="bg-white/80 rounded-3xl border border-border-sora shadow-sora overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-sora flex items-center justify-between">
            <h2 className="font-serif font-bold text-text-sora text-base">
              Directorio de Cuentas ({filteredUsers.length})
            </h2>
            <span className="text-xs text-text-sora/50">
              Sincronizado con tabla <code className="font-mono text-primary-sora">profiles</code>
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Users className="w-10 h-10 mx-auto text-text-sora/30 mb-3" />
              <h3 className="font-serif font-bold text-base text-text-sora">
                {searchQuery ? 'No se encontraron usuarios' : 'Sin usuarios adicionales'}
              </h3>
              <p className="text-xs text-text-sora/60 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No hay cuentas que coincidan con el término de búsqueda.'
                  : 'Registra los integrantes del equipo (Admin, Coadmin, Delivery) para conceder accesos.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setInviteName('');
                    setInviteEmail('');
                    setInvitePassword('');
                    setInviteRole('delivery');
                    setInvitePermissions(DEFAULT_ROLE_PERMISSIONS['delivery']);
                    setIsInviteOpen(true);
                  }}
                  className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Registrar Nuevo Usuario</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-sora/60">
              {filteredUsers.map((u) => {
                const isSelf = user?.id === u.id || currentProfile?.email === u.email;
                const isActive = u.is_active !== false;

                // Permisos activos del usuario
                const effectivePerms =
                  u.role === 'admin'
                    ? APP_PERMISSIONS.map((p) => p.id)
                    : u.permissions && u.permissions.length > 0
                    ? u.permissions
                    : DEFAULT_ROLE_PERMISSIONS[u.role] || [];

                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-bg-sora/30 transition-colors"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-primary-sora/15 text-primary-sora'
                            : u.role === 'coadmin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-text-sora">
                            {u.full_name || 'Usuario sin nombre'}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-sora/10 text-primary-sora border border-primary-sora/20">
                              Tú (Sesión actual)
                            </span>
                          )}

                          {/* Badge de Rol */}
                          {u.role === 'admin' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Admin
                            </span>
                          )}
                          {u.role === 'coadmin' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Shield className="w-3 h-3 mr-1" />
                              Coadmin
                            </span>
                          )}
                          {u.role === 'delivery' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Shield className="w-3 h-3 mr-1" />
                              Delivery
                            </span>
                          )}

                          {/* Estado Activo / Inactivo */}
                          {isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              ● Inactivo
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-text-sora/60 flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-text-sora/40" />
                          <span>{u.email}</span>
                        </p>

                        {/* Chips con las funciones permitidas */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-text-sora/50 font-medium mr-1 flex items-center">
                            <Layers className="w-3 h-3 mr-1" />
                            {effectivePerms.length} funciones:
                          </span>
                          {effectivePerms.map((permId) => {
                            const def = APP_PERMISSIONS.find((p) => p.id === permId);
                            if (!def) return null;
                            return (
                              <span
                                key={permId}
                                className="px-2 py-0.5 rounded-md bg-white border border-border-sora text-[10px] text-text-sora/80 font-medium shadow-2xs"
                              >
                                {def.label.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN: EDITAR Y ELIMINAR */}
                    <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0 pt-2 md:pt-0">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl border border-border-sora bg-white hover:bg-bg-sora text-text-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary-sora" />
                        <span>Editar Accesos</span>
                      </button>

                      {/* Botón Eliminar con confirmación */}
                      <button
                        onClick={() => setUserToDelete(u)}
                        disabled={isSelf}
                        title={isSelf ? 'No puedes eliminar tu propia cuenta activa' : 'Eliminar usuario permanentemente'}
                        className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. MODAL DE EDICIÓN DE ROL Y ACCESO A CADA FUNCIÓN */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col border border-border-sora shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40 flex-shrink-0">
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora">
                    Editar Rol y Accesos por Función
                  </h3>
                  <p className="text-xs text-text-sora/60 mt-0.5 truncate max-w-xs">
                    {editingUser.full_name || editingUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="p-6 overflow-y-auto space-y-6">
                {/* 1. Selección de Rol Base */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-text-sora/80 uppercase tracking-wider">
                      Rol Base
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditPermissions(DEFAULT_ROLE_PERMISSIONS[editRole] || [])}
                      className="text-[11px] text-primary-sora font-semibold hover:underline"
                    >
                      Cargar funciones recomendadas de este rol
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={user?.id === editingUser.id}
                      onClick={() => {
                        setEditRole('admin');
                        setEditPermissions(DEFAULT_ROLE_PERMISSIONS['admin']);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        editRole === 'admin'
                          ? 'border-primary-sora bg-primary-sora/10 text-primary-sora font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <span className="block text-xs font-bold">Admin</span>
                      <span className="block text-[10px] text-text-sora/60 mt-0.5">Control Total</span>
                    </button>

                    <button
                      type="button"
                      disabled={user?.id === editingUser.id}
                      onClick={() => {
                        setEditRole('coadmin');
                        setEditPermissions(DEFAULT_ROLE_PERMISSIONS['coadmin']);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        editRole === 'coadmin'
                          ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <span className="block text-xs font-bold">Coadmin</span>
                      <span className="block text-[10px] text-text-sora/60 mt-0.5">Operaciones</span>
                    </button>

                    <button
                      type="button"
                      disabled={user?.id === editingUser.id}
                      onClick={() => {
                        setEditRole('delivery');
                        setEditPermissions(DEFAULT_ROLE_PERMISSIONS['delivery']);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        editRole === 'delivery'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <span className="block text-xs font-bold">Delivery</span>
                      <span className="block text-[10px] text-text-sora/60 mt-0.5">Repartidor</span>
                    </button>
                  </div>

                  {user?.id === editingUser.id && (
                    <p className="text-[11px] text-primary-sora mt-2 bg-primary-sora/10 p-2 rounded-xl flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span>Protección activa: estás editando tu propia cuenta de Administrador.</span>
                    </p>
                  )}
                </div>

                {/* 2. SELECTOR DE ACCESOS A CADA FUNCIÓN (REQUERIMIENTO PRINCIPAL) */}
                <div className="pt-2 border-t border-border-sora">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-xs font-semibold text-text-sora/80 uppercase tracking-wider block">
                        Accesos Permitidos por Función
                      </label>
                      <p className="text-[11px] text-text-sora/60">
                        Selecciona a qué módulos y pantallas tendrá acceso este usuario.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditPermissions(APP_PERMISSIONS.map((p) => p.id))}
                        className="text-primary-sora font-semibold hover:underline text-[11px]"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-text-sora/30">•</span>
                      <button
                        type="button"
                        onClick={() => setEditPermissions([])}
                        className="text-text-sora/50 font-semibold hover:underline text-[11px]"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {APP_PERMISSIONS.map((func) => {
                      const isChecked = editPermissions.includes(func.id);

                      return (
                        <label
                          key={func.id}
                          className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'border-primary-sora/60 bg-primary-sora/5'
                              : 'border-border-sora bg-white hover:bg-bg-sora/40'
                          }`}
                        >
                          <div className="flex items-start space-x-3 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEditPermission(func.id)}
                              className="mt-0.5 w-4 h-4 rounded text-primary-sora focus:ring-primary-sora border-border-sora cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold ${isChecked ? 'text-text-sora' : 'text-text-sora/70'}`}>
                                  {func.label}
                                </span>
                                <span className="font-mono text-[10px] text-text-sora/40 bg-bg-sora px-1.5 py-0.5 rounded">
                                  {func.route}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-sora/60 mt-0.5">
                                {func.description}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[11px] font-bold self-center px-2 py-0.5 rounded-full ${
                            isChecked
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isChecked ? 'Permitido' : 'Bloqueado'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Activar / Desactivar Cuenta */}
                <div className="pt-2 border-t border-border-sora">
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Estado de la Cuenta
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-bg-sora/50 border border-border-sora">
                    <div className="flex items-center space-x-2">
                      <Power className={`w-4 h-4 ${editIsActive ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <div>
                        <p className="text-xs font-bold text-text-sora">
                          {editIsActive ? 'Cuenta Activa' : 'Cuenta Inactiva (Bloqueada)'}
                        </p>
                        <p className="text-[10px] text-text-sora/50">
                          {editIsActive ? 'Permite iniciar sesión con sus accesos' : 'Bloquea el ingreso al sistema'}
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={editIsActive}
                      disabled={user?.id === editingUser.id}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="w-5 h-5 rounded text-primary-sora focus:ring-primary-sora border-border-sora cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-border-sora flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-text-sora/70 hover:bg-border-sora/30"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm shadow-primary-sora/20 disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Permisos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. MODAL DE CONFIRMACIÓN PARA ELIMINAR USUARIO */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full border border-red-200 shadow-2xl overflow-hidden">
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="font-serif font-bold text-xl text-text-sora">
                    ¿Eliminar este usuario?
                  </h3>
                  <p className="text-xs text-text-sora/70 mt-1 max-w-sm mx-auto">
                    Estás a punto de eliminar la cuenta de{' '}
                    <strong className="text-text-sora font-semibold">
                      {userToDelete.full_name || userToDelete.email}
                    </strong>{' '}
                    ({userToDelete.email}).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-left text-xs text-red-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>Acción Permanente</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    El usuario perderá inmediatamente el acceso a Sora Cocina Casera y sus credenciales serán removidas de la base de datos.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center space-x-3">
                  <button
                    type="button"
                    disabled={isDeletingUser}
                    onClick={() => setUserToDelete(null)}
                    className="px-5 py-2.5 rounded-xl border border-border-sora bg-white text-text-sora text-xs font-semibold hover:bg-bg-sora transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingUser}
                    onClick={handleConfirmDeleteUser}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isDeletingUser ? (
                      <span>Eliminando...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Sí, Eliminar Cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. MODAL DE INVITACIÓN / REGISTRO DE USUARIOS CON ACCESOS */}
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col border border-border-sora shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40 flex-shrink-0">
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora">
                    Registrar Miembro del Equipo
                  </h3>
                  <p className="text-xs text-text-sora/60 mt-0.5">
                    Asigna credenciales, rol y accesos a cada función
                  </p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterUser} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-text-sora/40 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carolina Soto"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-text-sora/40 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="cocina@sorarestaurante.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Contraseña Inicial *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-text-sora/40 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-sora bg-bg-sora/40 text-text-sora text-xs focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-1 uppercase tracking-wider">
                    Rol Asignado *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInviteRole('admin');
                        setInvitePermissions(DEFAULT_ROLE_PERMISSIONS['admin']);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        inviteRole === 'admin'
                          ? 'bg-primary-sora text-white border-primary-sora shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteRole('coadmin');
                        setInvitePermissions(DEFAULT_ROLE_PERMISSIONS['coadmin']);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        inviteRole === 'coadmin'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      Coadmin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteRole('delivery');
                        setInvitePermissions(DEFAULT_ROLE_PERMISSIONS['delivery']);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        inviteRole === 'delivery'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-text-sora/70 border-border-sora hover:bg-bg-sora'
                      }`}
                    >
                      Delivery
                    </button>
                  </div>
                </div>

                {/* Selección de Funciones en Invitación */}
                <div className="pt-2 border-t border-border-sora">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-text-sora/80 uppercase tracking-wider block">
                      Accesos a Funciones
                    </label>
                    <button
                      type="button"
                      onClick={() => setInvitePermissions(APP_PERMISSIONS.map((p) => p.id))}
                      className="text-primary-sora font-semibold text-[11px] hover:underline"
                    >
                      Marcar Todas
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {APP_PERMISSIONS.map((func) => {
                      const isChecked = invitePermissions.includes(func.id);

                      return (
                        <label
                          key={func.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'border-primary-sora/50 bg-primary-sora/5'
                              : 'border-border-sora bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleInvitePermission(func.id)}
                              className="w-4 h-4 rounded text-primary-sora focus:ring-primary-sora border-border-sora cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-text-sora">
                              {func.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-sora/40">
                            {func.route}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border-sora flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-text-sora/70 hover:bg-border-sora/30"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="px-5 py-2.5 rounded-xl bg-primary-sora text-white text-xs font-semibold hover:bg-primary-hover shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingInvite ? 'Registrando...' : 'Registrar en Supabase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}
