'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_INFO, UserRole } from '@/types/database.types';
import {
  ChefHat,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'deactivated'
      ? 'Esta cuenta ha sido desactivada por el administrador. Contacta al equipo de Sora.'
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Correo o contraseña incorrectos. Por favor verifica tus credenciales.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Tu correo no ha sido confirmado aún en Supabase.');
        } else {
          setErrorMessage(error.message || 'Error al iniciar sesión.');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMessage('¡Bienvenido a Sora! Verificando credenciales...');

        // Consultar el rol en la tabla 'profiles'
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const userRole: UserRole =
          (profile?.role as UserRole) ||
          (data.user.user_metadata?.role as UserRole) ||
          'admin';

        const roleConfig = ROLE_INFO[userRole] || ROLE_INFO.admin;
        const targetRoute = redirectParam || roleConfig.defaultRoute;

        // Redireccionar al destino correspondiente según el rol
        router.push(targetRoute);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Error durante login:', err);
      setErrorMessage(
        err?.message || 'Ocurrió un error inesperado al conectar con Supabase.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Cabecera / Identidad Sora */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-sora text-white shadow-lg shadow-primary-sora/20 mb-4 transition-transform hover:scale-105">
          <ChefHat className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-text-sora tracking-tight">
          Sora Cocina Casera
        </h1>
        <p className="text-text-sora/60 text-sm mt-1">
          Plataforma interna de gestión y pedidos
        </p>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-border-sora shadow-sora">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-sora">Iniciar Sesión</h2>
          <p className="text-xs text-text-sora/60 mt-1">
            Ingresa tus credenciales de equipo para acceder a tu panel
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Campo Correo Electrónico */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-text-sora/80 mb-1.5 uppercase tracking-wider"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@sorarestaurante.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-sora bg-bg-sora/50 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-text-sora/80 uppercase tracking-wider"
              >
                Contraseña
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-sora/40">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border-sora bg-bg-sora/50 text-text-sora text-sm placeholder:text-text-sora/30 focus:outline-none focus:ring-2 focus:ring-primary-sora/20 focus:border-primary-sora transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-sora/40 hover:text-text-sora transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-primary-sora hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-md shadow-primary-sora/25 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Guía informativa de Roles del Sistema */}
      <div className="mt-6 p-4 rounded-2xl bg-white/50 border border-border-sora/60 text-xs text-text-sora/70">
        <div className="flex items-center space-x-1.5 font-semibold text-text-sora mb-2">
          <ShieldCheck className="w-4 h-4 text-primary-sora" />
          <span>Control de Roles (Tabla 'profiles')</span>
        </div>
        <ul className="space-y-1.5 text-[11px] list-disc list-inside">
          <li>
            <strong className="text-text-sora font-semibold">admin:</strong> Acceso completo a Dashboard, Gastos y Delivery.
          </li>
          <li>
            <strong className="text-text-sora font-semibold">coadmin:</strong> Acceso a control de Gastos y despacho de Delivery.
          </li>
          <li>
            <strong className="text-text-sora font-semibold">delivery:</strong> Acceso exclusivo a la vista móvil de entregas.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-sora flex items-center justify-center p-4 sm:p-6 md:p-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary-sora animate-spin" />
            <p className="text-xs text-text-sora/60 font-medium">Cargando acceso Sora...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
