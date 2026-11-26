import Link from 'next/link';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import BotonRpc from '@/components/BotonRpc';
import CrearEquipo from '@/components/CrearEquipo';

export const dynamic = 'force-dynamic';

export default async function Equipos() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: mias, error } = await supabase
    .from('equipo_fijo_miembros')
    .select('estado, equipo:equipos_fijos ( id, nombre, capitan_id, equipo_fijo_miembros ( estado ) )')
    .eq('jugador_id', user.id);
  const lista = mias ?? [];
  const miembro = lista.filter((m) => m.estado === 'miembro');
  const invitado = lista.filter((m) => m.estado === 'invitado');
  const solicitado = lista.filter((m) => m.estado === 'solicitado');
  const cuenta = (e) => e.equipo_fijo_miembros.filter((x) => x.estado === 'miembro').length;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Mis equipos</h1>
          <p>Arma tu equipo con tus amigos para jugar siempre juntos.</p>
        </div>
      </div>
      {error && <p className="err">{error.message}</p>}

      {invitado.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--flag)' }}>
          <h2 style={{ fontSize: 22 }}>Invitaciones ({invitado.length})</h2>
          {invitado.map(({ equipo: e }) => (
            <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href={`/equipos/${e.id}`}><b>{e.nombre}</b></Link> te invitó · {cuenta(e)} integrantes
              <BotonRpc fn="responder_equipo" args={{ p_equipo: e.id, p_jugador: user.id, p_aceptar: true }}>Aceptar</BotonRpc>
              <BotonRpc fn="responder_equipo" args={{ p_equipo: e.id, p_jugador: user.id, p_aceptar: false }} className="btn ghost">Rechazar</BotonRpc>
            </div>
          ))}
        </div>
      )}

      <div className="list">
        {miembro.length === 0 && <div className="card empty">Aún no perteneces a ningún equipo. Crea uno o pide unirte al de un amigo desde su perfil.</div>}
        {miembro.map(({ equipo: e }) => (
          <Link key={e.id} href={`/equipos/${e.id}`} className="card" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            <h3 style={{ fontSize: 22 }}>{e.nombre}</h3>
            <span className="meta"><span>{cuenta(e)} integrantes</span>{e.capitan_id === user.id && <span><b>Eres el capitán</b></span>}</span>
          </Link>
        ))}
      </div>

      {solicitado.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 22 }}>Solicitudes enviadas</h2>
          {solicitado.map(({ equipo: e }) => (
            <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href={`/equipos/${e.id}`}>{e.nombre}</Link> · esperando al capitán
              <BotonRpc fn="salir_equipo_fijo" args={{ p_equipo: e.id }} className="btn ghost">Cancelar</BotonRpc>
            </div>
          ))}
        </div>
      )}

      <CrearEquipo />
    </>
  );
}
