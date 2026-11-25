import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import Ficha from '@/components/Ficha';

export const dynamic = 'force-dynamic';

export default async function Jugador({ params }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (id === user.id) redirect('/perfil');

  const { data: jugador } = await supabase.from('jugadores_publico').select('*').eq('id', id).maybeSingle();
  if (!jugador) notFound();
  const { data: faltas } = await supabase.from('denuncias').select('tipo, creado_en').eq('denunciado_id', id).eq('estado', 'confirmada');

  return (
    <>
      <Ficha jugador={jugador} faltas={faltas ?? []} extra={<span>El teléfono se ve al estar en el mismo equipo</span>} />
      <Link href="/">← Volver a los partidos</Link>
    </>
  );
}
