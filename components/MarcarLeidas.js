'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

// Al abrir la página de notificaciones, las marca como leídas y actualiza el contador del menú
export default function MarcarLeidas() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(async () => {
      await crearClienteNavegador().rpc('marcar_notificaciones_leidas');
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
