'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_INFO } from '@/types/database.types';
import { ChefHat, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        const defaultRoute = role ? ROLE_INFO[role]?.defaultRoute : '/dashboard';
        router.replace(defaultRoute || '/dashboard');
      }
    }
  }, [user, role, isLoading, router]);

  return (
    <div className="min-h-screen bg-bg-sora flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-primary-sora text-white flex items-center justify-center shadow-lg shadow-primary-sora/20 animate-pulse">
          <ChefHat className="w-8 h-8" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-2xl text-text-sora">Sora Cocina Casera</h1>
          <p className="text-sm text-text-sora/60 mt-1">Cargando tu espacio de trabajo...</p>
        </div>
        <Loader2 className="w-6 h-6 text-primary-sora animate-spin" />
      </div>
    </div>
  );
}
