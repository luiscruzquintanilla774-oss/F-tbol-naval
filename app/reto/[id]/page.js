import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import { fechaLima } from '@/lib/datos';
import Cancha from '@/components/Cancha';
import LogoEquipo from '@/components/LogoEquipo';
import AceptarReto from '@/components/AceptarReto';

export const dynamic = 'force-dynamic';

export default async function Reto({ params }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p } = await supabase.from('publicaciones')
    .select(`id, tipo, distrito, cancha, direccion, fecha_hora, costo_por_jugador, equipo_fijo_id, rival_fijo_id,
      equipo:equipos!publicaciones_equipo_id_fkey ( nombre ), rival:equipos!publicaciones_rival_equipo_id_fkey ( nombre ),
      fijo:equipos_fijos!publicaciones_equipo_fijo_id_fkey ( nombre, logo_url ), rivalFijo:equipos_fijos!publicaciones_rival_fijo_id_fkey ( nombre, logo_url )`)
    .eq('id', id).maybeSingle();
  if (!p || p.tipo !== 'reto') notFound();

  const { data: alineacion } = await supabase.from('reto_alineacion').select('equipo_fijo_id, jugador_id').eq('publicacion_id', id);
  const ids = (alineacion ?? []).map((a) => a.jugador_id);
  const { data: jugadores } = ids.length
    ? await supabase.from('jugadores_publico').select('id, alias, foto_url, posicion, medalla').in('id', ids)
    : { data: [] };
  const porId = Object.fromEntries((jugadores ?? []).map((j) => [j.id, j]));
  const de = (equipo) => (alineacion ?? []).filter((a) => a.equipo_fijo_id === equipo).map((a) => porId[a.jugador_id]).filter(Boolean);
  const yoJuego = ids.includes(user.id);
  const pasado = new Date(p.fecha_hora) < new Date();

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Reto: {p.equipo.nombre}{p.rival ? ` vs ${p.rival.nombre}` : ''}</h1>
          <p><b>{fechaLima(p.fecha_hora)}</b> · {p.distrito} · {p.cancha}, {p.direccion} · S/ {Number(p.costo_por_jugador).toFixed(2)} por jugador</p>
        </div>
      </div>

      {p.fijo && (
        <div className="card versus">
          <div className="lado"><LogoEquipo equipo={p.fijo} tam={80} /><b>{p.fijo.nombre}</b></div>
          <span className="vs">VS</span>
          <div className="lado">
            {p.rivalFijo ? <><LogoEquipo equipo={p.rivalFijo} tam={80} /><b>{p.rivalFijo.nombre}</b></>
              : <><span className="sin-rival" style={{ width: 80, height: 80 }}>?</span><span className="chip need">Busca rival</span></>}
          </div>
        </div>
      )}
      {!p.equipo_fijo_id && (
        <p className="note">Este reto se creó antes de que existieran los equipos registrados, por eso no muestra alineación y no se puede aceptar.</p>
      )}

      <div className="dos-canchas">
        {p.equipo_fijo_id && <Cancha nombre={p.equipo.nombre} jugadores={de(p.equipo_fijo_id)} equipoId={p.equipo_fijo_id} />}
        {p.rival_fijo_id && <Cancha nombre={p.rival.nombre} jugadores={de(p.rival_fijo_id)} equipoId={p.rival_fijo_id} />}
      </div>

      {p.equipo_fijo_id && !p.rival && !yoJuego && !pasado && (
        <AceptarReto publicacionId={p.id} equipoRetador={p.equipo_fijo_id} />
      )}
      {p.rival && <p className="chip need" style={{ justifySelf: 'start' }}>Reto aceptado por {p.rival.nombre}</p>}
      <Link href="/">← Ver todos los retos</Link>
    </>
  );
}
