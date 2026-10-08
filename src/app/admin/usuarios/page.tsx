'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database.types';
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
  Key,
  Users,
  Search,
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

  // Estados de Modales
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('delivery');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal de Invitación / Registro
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('delivery');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // 1. Cargar usuarios desde Supabase
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setUsers(data as Profile[]);
      } else if (currentProfile) {
        setUsers([currentProfile]);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn('Conexión con perfiles de Sora', err);
      if (currentProfile) {
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
  };

  // 2. Guardar Edición de Rol y Estado
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
    try {
      await supabase
        .from('profiles')
        .update({
          role: editRole,
          is_active: editIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);
    } catch (err) {
      console.warn('Actualización local de perfil');
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? { ...u, role: editRole, is_active: editIsActive }
          : u
      )
    );

    setIsSavingEdit(false);
    setEditingUser(null);
    showFeedback(`Permisos actualizados para ${editingUser.full_name || editingUser.email}`);
  };

  // 3. Registrar / Invitar Usuario del Equipo
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !invitePassword.trim()) {
      showFeedback('Completa el correo y la contraseña.', 'error');
      return;
    }

    setIsSubmittingInvite(true);
    const newUserId = `usr-${Date.now().toString().slice(-4)}`;
    const newProfile: Profile = {
      id: newUserId,
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || inviteEmail.split('@')[0],
      role: inviteRole,
      is_active: true,
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
          },
        },
      });

      if (data?.user) {
        newProfile.id = data.user.id;
      }

      // Asegurar registro en la tabla profiles
      await supabase.from('profiles').upsert([
        {
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: inviteRole,
          is_active: true,
        },
      ]);
    } catch (err) {
      console.warn('Usuario registrado en estado local');
    }

    setUsers([...users, newProfile]);
    setIsSubmittingInvite(false);
    setIsInviteOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    showFeedback(`¡Usuario ${newProfile.full_name} registrado con rol ${inviteRole.toUpperCase()}!`);
  };

  // Atajos para prellenar roles del equipo
  const fillRoleTemplate = (targetRole: UserRole, defaultTitle: string) => {
    setInviteRole(targetRole);
    setInviteName(defaultTitle);
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
      <div className="space-y-8">
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
              Gestión de Usuarios y Roles
            </h1>
            <p className="text-xs sm:text-sm text-text-sora/70">
              Administra las credenciales, niveles de autorización y cuentas activas del equipo de Sora.
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
                Acceso total al sistema: Ventas, Clientes, Gastos, Delivery y Reportes Financieros.
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
                Gestión operativa: Registro de Gastos y Despacho de Pedidos Delivery.
              </p>
            </div>
            <div className="pt-3 border-t border-border-sora/60 mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-text-sora/60">
                {users.filter((u) => u.role === 'coadmin').length} usuario(s)
              </span>
              <button
                onClick={() => fillRoleTemplate('coadmin', 'Co-Administrador de Turno')}
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
                Acceso exclusivo a la vista móvil con rutas Google Maps, Waze y WhatsApp.
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

        {/* 1. TABLA / LISTA DE USUARIOS (PROFILES) */}
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

                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-bg-sora/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center space-x-3.5">
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

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-text-sora">
                            {u.full_name || 'Usuario sin nombre'}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-sora/10 text-primary-sora border border-primary-sora/20">
                              Tú (Sesión actual)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-sora/60 flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-text-sora/40" />
                          <span>{u.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-sora/40">
                      {/* BADGES DISTINTIVOS PARA CADA ROL */}
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary-sora/15 text-primary-sora border border-primary-sora/30">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Admin (Terracota)
                        </span>
                      )}
                      {u.role === 'coadmin' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          Coadmin (Azul suave)
                        </span>
                      )}
                      {u.role === 'delivery' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          Delivery (Verde)
                        </span>
                      )}

                      {/* ESTADO ACTIVO / INACTIVO */}
                      {isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          ● Inactivo
                        </span>
                      )}

                      {/* BOTÓN EDITAR ROL Y ACCESOS */}
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl border border-border-sora bg-white hover:bg-bg-sora text-text-sora text-xs font-semibold transition-all shadow-sm active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary-sora" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. MODAL DE EDICIÓN DE ROL Y ACCESOS */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-sora shadow-sora overflow-hidden">
              <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40">
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora">
                    Editar Rol y Accesos
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

              <form onSubmit={handleSaveUserEdit} className="p-6 space-y-5">
                {/* Asignación de Rol */}
                <div>
                  <label className="block text-xs font-semibold text-text-sora/80 mb-2 uppercase tracking-wider">
                    Nivel de Rol
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        editRole === 'admin'
                          ? 'border-primary-sora bg-primary-sora/10 text-primary-sora font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={editRole === 'admin'}
                          onChange={() => setEditRole('admin')}
                          className="text-primary-sora"
                        />
                        <span className="text-xs">Admin (Acceso Total)</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/70">
                        Terracota
                      </span>
                    </label>

                    <label
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        editRole === 'coadmin'
                          ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="role"
                          value="coadmin"
                          checked={editRole === 'coadmin'}
                          disabled={user?.id === editingUser.id}
                          onChange={() => setEditRole('coadmin')}
                          className="text-blue-600"
                        />
                        <span className="text-xs">Coadmin (Gastos + Despacho)</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/70 text-blue-800">
                        Azul suave
                      </span>
                    </label>

                    <label
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        editRole === 'delivery'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-border-sora hover:bg-bg-sora text-text-sora'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="role"
                          value="delivery"
                          checked={editRole === 'delivery'}
                          disabled={user?.id === editingUser.id}
                          onChange={() => setEditRole('delivery')}
                          className="text-emerald-600"
                        />
                        <span className="text-xs">Delivery (Móvil Reparto)</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/70 text-emerald-800">
                        Verde
                      </span>
                    </label>
                  </div>

                  {user?.id === editingUser.id && (
                    <p className="text-[11px] text-primary-sora mt-2 bg-primary-sora/10 p-2 rounded-xl flex items-center">
                      <ShieldAlert className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span>Protección de seguridad activa: no puedes remover tu propio rol de administrador.</span>
                    </p>
                  )}
                </div>

                {/* Activar / Desactivar Cuenta */}
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
                          {editIsActive ? 'Permite iniciar sesión normalmente' : 'Bloquea el acceso al sistema'}
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
                    {isSavingEdit ? 'Guardando...' : 'Actualizar Permisos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. MODAL DE INVITACIÓN / REGISTRO DE USUARIOS */}
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-sora shadow-sora overflow-hidden">
              <div className="px-6 py-5 border-b border-border-sora flex items-center justify-between bg-bg-sora/40">
                <div>
                  <h3 className="font-serif font-bold text-lg text-text-sora">
                    Registrar Miembro del Equipo
                  </h3>
                  <p className="text-xs text-text-sora/60 mt-0.5">
                    Asigna credenciales y rol directo de acceso
                  </p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  className="p-1.5 rounded-xl text-text-sora/50 hover:text-text-sora hover:bg-border-sora/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterUser} className="p-6 space-y-4">
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
                      onClick={() => setInviteRole('admin')}
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
                      onClick={() => setInviteRole('coadmin')}
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
                      onClick={() => setInviteRole('delivery')}
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
