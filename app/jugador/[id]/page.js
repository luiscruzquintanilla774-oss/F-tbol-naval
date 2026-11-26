import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import Ficha from '@/components/Ficha';
import Social from '@/components/Social';
import BotonAmistad from '@/components/BotonAmistad';

export const dynamic = 'force-dynamic';

export default async function Jugador({ params }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (id === user.id) redirect('/perfil');

  const { data: jugador } = await supabase.from('jugadores_publico').select('*').eq('id', id).maybeSingle();
  if (!jugador) notFound();
  const [{ data: faltas }, { data: resumen }, { data: comunes }, { data: equipos }] = await Promise.all([
    supabase.from('denuncias').select('tipo, creado_en').eq('denunciado_id', id).eq('estado', 'confirmada'),
    supabase.rpc('resumen_amistad', { p_jugador: id }),
    supabase.rpc('amigos_en_comun', { p_jugador: id }),
    supabase.from('equipo_fijo_miembros').select('equipo:equipos_fijos ( id, nombre )').eq('jugador_id', id).eq('estado', 'miembro'),
  ]);
  const r = resumen?.[0];

  return (
    <>
      <Ficha jugador={jugador} faltas={faltas ?? []} extra={<span>El teléfono se ve al estar en el mismo equipo</span>}>
        <div><BotonAmistad jugadorId={id} estado={r?.estado ?? 'ninguna'} /></div>
      </Ficha>
      <Social resumen={r} comunes={comunes ?? []} equipos={(equipos ?? []).map((e) => e.equipo)} />
      <Link href="/jugadores">← Buscar más jugadores</Link>
    </>
  );
}
