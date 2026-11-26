import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import BotonRpc from '@/components/BotonRpc';
import FilaJugador from '@/components/FilaJugador';
import LogoEquipo from '@/components/LogoEquipo';
import CambiarLogo from '@/components/CambiarLogo';

export const dynamic = 'force-dynamic';

export default async function Equipo({ params }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: equipo } = await supabase.from('equipos_fijos').select('id, nombre, capitan_id, logo_url').eq('id', id).maybeSingle();
  if (!equipo) notFound();
  const { data: filas } = await supabase.from('equipo_fijo_miembros').select('jugador_id, estado').eq('equipo_id', id);
  const esCapitan = equipo.capitan_id === user.id;

  // Mis amigos (para invitar) y datos públicos de todos los involucrados
  const { data: amistades } = esCapitan ? await supabase.rpc('mis_amistades') : { data: [] };
  const amigos = (amistades ?? []).filter((a) => a.estado === 'amigos');
  const ids = [...new Set((filas ?? []).map((f) => f.jugador_id).concat(equipo.capitan_id))];
  const { data: jugadores } = await supabase.from('jugadores_publico').select('*').in('id', ids);
  const porId = Object.fromEntries((jugadores ?? []).map((j) => [j.id, j]));

  const de = (estado) => (filas ?? []).filter((f) => f.estado === estado).map((f) => porId[f.jugador_id]).filter(Boolean);
  const miembros = de('miembro');
  const solicitados = de('solicitado');
  const invitados = de('invitado');
  const miEstado = (filas ?? []).find((f) => f.jugador_id === user.id)?.estado ?? null;
  const yaEstan = new Set((filas ?? []).map((f) => f.jugador_id));
  const paraInvitar = amigos.filter((a) => !yaEstan.has(a.id));
  const { data: esAmigoCapitan } = !esCapitan && !miEstado
    ? await supabase.rpc('son_amigos', { a: user.id, b: equipo.capitan_id })
    : { data: false };

  return (
    <>
      <div className="pagehead">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <LogoEquipo equipo={equipo} tam={72} />
          <div>
          <h1>{equipo.nombre}</h1>
          <p>Capitán: <Link href={`/jugador/${equipo.capitan_id}`}>{porId[equipo.capitan_id]?.alias ?? '—'}</Link> · {miembros.length} de 12 integrantes</p>
          {esCapitan && <CambiarLogo equipoId={id} tieneLogo={!!equipo.logo_url} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!esCapitan && miEstado === 'miembro' && (
            <BotonRpc fn="salir_equipo_fijo" args={{ p_equipo: id }} className="btn ghost" confirmar="¿Salir del equipo?">Salir del equipo</BotonRpc>
          )}
          {!esCapitan && miEstado === 'invitado' && (
            <>
              <BotonRpc fn="responder_equipo" args={{ p_equipo: id, p_jugador: user.id, p_aceptar: true }}>Aceptar invitación</BotonRpc>
              <BotonRpc fn="responder_equipo" args={{ p_equipo: id, p_jugador: user.id, p_aceptar: false }} className="btn ghost">Rechazar</BotonRpc>
            </>
          )}
          {!esCapitan && miEstado === 'solicitado' && (
            <BotonRpc fn="salir_equipo_fijo" args={{ p_equipo: id }} className="btn ghost">Cancelar mi solicitud</BotonRpc>
          )}
          {!esCapitan && !miEstado && esAmigoCapitan && (
            <BotonRpc fn="solicitar_equipo" args={{ p_equipo: id }}>Solicitar unirme</BotonRpc>
          )}
          {esCapitan && (
            <BotonRpc fn="eliminar_equipo_fijo" args={{ p_equipo: id }} className="btn warn" confirmar="¿Eliminar el equipo para siempre?" irA="/equipos">Eliminar equipo</BotonRpc>
          )}
        </div>
      </div>
      {!equipo.logo_url && (
        <p className="note">Este equipo aún no tiene logo. {esCapitan ? 'Súbelo' : 'El capitán debe subirlo'} para poder lanzar o aceptar retos.</p>
      )}
      {!esCapitan && !miEstado && !esAmigoCapitan && (
        <p className="note">Para pedir unirte, primero tienes que ser amigo del capitán.</p>
      )}

      {esCapitan && solicitados.length > 0 && (
        <div className="card" style={{ gap: 0, borderColor: 'var(--flag)' }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Quieren unirse ({solicitados.length})</h2>
          {solicitados.map((j) => (
            <FilaJugador key={j.id} j={j}>
              <BotonRpc fn="responder_equipo" args={{ p_equipo: id, p_jugador: j.id, p_aceptar: true }}>Aceptar</BotonRpc>
              <BotonRpc fn="responder_equipo" args={{ p_equipo: id, p_jugador: j.id, p_aceptar: false }} className="btn ghost">Rechazar</BotonRpc>
            </FilaJugador>
          ))}
        </div>
      )}

      <div className="card" style={{ gap: 0 }}>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Integrantes ({miembros.length})</h2>
        {miembros.map((j) => (
          <FilaJugador key={j.id} j={j} detalle={j.id === equipo.capitan_id ? 'Capitán' : null}>
            {esCapitan && j.id !== user.id && (
              <BotonRpc fn="ceder_capitania" args={{ p_equipo: id, p_jugador: j.id }} className="btn ghost"
                confirmar={`¿Nombrar capitán a ${j.alias ?? 'este jugador'}? Dejarás de serlo.`}>Hacer capitán</BotonRpc>
            )}
            {esCapitan && j.id !== user.id && (
              <BotonRpc fn="quitar_de_equipo" args={{ p_equipo: id, p_jugador: j.id }} className="btn ghost" confirmar="¿Quitarlo?">Quitar</BotonRpc>
            )}
          </FilaJugador>
        ))}
      </div>

      {esCapitan && (
        <div className="card" style={{ gap: 0 }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Invitar amigos</h2>
          {invitados.length > 0 && (
            <p style={{ margin: '4px 0 8px', color: 'var(--muted)' }}>Invitados esperando respuesta: {invitados.map((j) => j.alias).join(', ')}</p>
          )}
          {paraInvitar.length === 0 && (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No tienes más amigos para invitar. <Link href="/amigos">Busca jugadores</Link> y agrégalos.</p>
          )}
          {paraInvitar.map((j) => (
            <FilaJugador key={j.id} j={j}>
              <BotonRpc fn="invitar_a_equipo" args={{ p_equipo: id, p_jugador: j.id }}>Invitar</BotonRpc>
            </FilaJugador>
          ))}
        </div>
      )}
    </>
  );
}
