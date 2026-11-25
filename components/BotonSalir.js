'use client';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

export default function BotonSalir() {
  const router = useRouter();
  async function salir() {
    await crearClienteNavegador().auth.signOut();
    router.push('/');
    router.refresh();
  }
  return <button onClick={salir}>Salir</button>;
}
