import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/server';
import { DISTRITOS, fechaLima, nombrePosicion, uno } from '@/lib/datos';
import Avatar from '@/components/Avatar';
import Acciones from '@/components/Acciones';

export const dynamic = 'force-dynamic';

export default async function Inicio({ searchParams }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="hero">
        <h1>¿Te falta equipo para el fulbito?</h1>
        <p>
          En Fútbol Naval encuentras equipos de fútbol 7 a los que les faltan jugadores, o rivales para tu
          equipo completo, en tu distrito de Lima. Cada jugador tiene una nota de conducta y una medalla para
          que sepas con quién juegas.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn" href="/registro">Crear mi cuenta</Link>
          <Link className="btn ghost" href="/login">Ya tengo cuenta</Link>
        </div>
      </section>
    );
  }

  const filtros = await searchParams;
  let consulta = supabase
    .from('publicaciones')
    .select(`id, tipo, distrito, cancha, direccion, fecha_hora, costo_por_jugador, jugadores_faltantes, conducta_minima,
      equipo:equipos!publicaciones_equipo_id_fkey ( id, nombre, capitan_id, equipo_jugadores ( jugador_id ) ),
      rival:equipos!publicaciones_rival_equipo_id_fkey ( nombre ),
      publicacion_posiciones ( posicion )`)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora');
  if (filtros?.distrito) consulta = consulta.eq('distrito', filtros.distrito);
  if (filtros?.tipo) consulta = consulta.eq('tipo', filtros.tipo);
  const { data: publicaciones, error } = await consulta;

  const ids = [...new Set((publicaciones ?? []).flatMap((p) => p.equipo.equipo_jugadores.map((j) => j.jugador_id)).concat(user.id))];
  const { data: jugadores } = await supabase.from('jugadores_publico').select('*').in('id', ids);
  const porId = Object.fromEntries((jugadores ?? []).map((j) => [j.id, j]));
  const yo = porId[user.id];

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Partidos de fútbol 7</h1>
          <p>Únete a un equipo incompleto o acepta el reto de un equipo completo.</p>
        </div>
        <form className="filters" method="get">
          <select name="tipo" defaultValue={filtros?.tipo ?? ''} aria-label="Tipo">
            <option value="">Todos</option>
            <option value="faltan_jugadores">Faltan jugadores</option>
            <option value="reto">Retos</option>
          </select>
          <select name="distrito" defaultValue={filtros?.distrito ?? ''} aria-label="Distrito">
            <option value="">Todos los distritos</option>
            {DISTRITOS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="btn ghost" type="submit">Filtrar</button>
        </form>
      </div>

      {!yo && (
        <p className="note">No encontramos tu perfil. Si acabas de registrarte, vuelve a ingresar en unos segundos.</p>
      )}
      {yo && !yo.alias && (
        <p className="note">Elige tu alias en <Link href="/perfil">Mi perfil</Link>. Es el nombre con el que te verán los demás jugadores.</p>
      )}
      {error && <p className="err">No se pudieron cargar los partidos: {error.message}</p>}

      <div className="list">
        {(publicaciones ?? []).length === 0 && (
          <div className="card empty">
            No hay partidos próximos con esos filtros. <Link href="/publicar">Publica el primero</Link>.
          </div>
        )}
        {(publicaciones ?? []).map((p) => {
          const integrantes = p.equipo.equipo_jugadores.map((j) => porId[j.jugador_id]).filter(Boolean);
          const enEquipo = integrantes.some((j) => j.id === user.id);
          const promedio = integrantes.length ? integrantes.reduce((a, j) => a + Number(j.conducta), 0) / integrantes.length : 0;
          return (
            <article className="card post" key={p.id}>
              <div className={`kind ${p.tipo}`}>{p.tipo === 'reto' ? 'Reto' : `Faltan ${p.jugadores_faltantes}`}</div>
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <h3>{p.equipo.nombre}</h3>
                <div className="meta">
                  <span><b>{fechaLima(p.fecha_hora)}</b></span>
                  <span><b>{p.distrito}</b> · {p.cancha}, {p.direccion}</span>
                  <span>S/ {Number(p.costo_por_jugador).toFixed(2)} por jugador</span>
                </div>
                <div className="chips">
                  {p.publicacion_posiciones.map((x) => (
                    <span className="chip need" key={x.posicion}>Busca {nombrePosicion(x.posicion).toLowerCase()}</span>
                  ))}
                  {p.tipo === 'faltan_jugadores' && <span className="chip">Conducta mínima {uno(p.conducta_minima)}</span>}
                  <span className="chip">Conducta promedio <span className="score">{uno(promedio)}</span></span>
                </div>
                <div className="roster">
                  {integrantes.map((j) => (
                    <Link className="pbtn" key={j.id} href={j.id === user.id ? '/perfil' : `/jugador/${j.id}`}>
                      <Avatar jugador={j} />
                      {j.alias ?? 'Sin alias'}{j.id === p.equipo.capitan_id ? ' (C)' : ''}
                    </Link>
                  ))}
                </div>
              </div>
              <Acciones
                publicacion={{ id: p.id, tipo: p.tipo, faltantes: p.jugadores_faltantes, conductaMinima: Number(p.conducta_minima), rival: p.rival?.nombre ?? null, equipoId: p.equipo.id }}
                enEquipo={enEquipo}
                esCapitan={p.equipo.capitan_id === user.id}
                miConducta={Number(yo?.conducta ?? 10)}
              />
            </article>
          );
        })}
      </div>
    </>
  );
}
