import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/server';
import { DISTRITOS, fechaLima } from '@/lib/datos';
import LogoEquipo from '@/components/LogoEquipo';

export const dynamic = 'force-dynamic';

export default async function Inicio({ searchParams }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="hero">
        <h1>¿Tu equipo es tan bueno como creen?</h1>
        <p>
          En Fútbol Naval los equipos de fútbol 7 de Lima se retan para medir su nivel. Registra tu equipo con
          su logo, arma tu alineación de 7 y acepta el reto de otro equipo en tu distrito.
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
    .select(`id, distrito, cancha, direccion, fecha_hora, costo_por_jugador, equipo_fijo_id,
      fijo:equipos_fijos!publicaciones_equipo_fijo_id_fkey ( id, nombre, logo_url ),
      rival:equipos_fijos!publicaciones_rival_fijo_id_fkey ( id, nombre, logo_url )`)
    .eq('tipo', 'reto')
    .not('equipo_fijo_id', 'is', null)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora');
  if (filtros?.distrito) consulta = consulta.eq('distrito', filtros.distrito);
  if (filtros?.estado === 'abiertos') consulta = consulta.is('rival_fijo_id', null);
  const { data: retos, error } = await consulta;

  const { data: yo } = await supabase.from('jugadores_publico').select('id, alias').eq('id', user.id).maybeSingle();

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Retos de fútbol 7</h1>
          <p>Equipos que buscan rival para medir su nivel. Acepta un reto con tu equipo de 7 o más.</p>
        </div>
        <form className="filters" method="get">
          <select name="estado" defaultValue={filtros?.estado ?? ''} aria-label="Estado">
            <option value="">Todos los retos</option>
            <option value="abiertos">Buscan rival</option>
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
      {error && <p className="err">No se pudieron cargar los retos: {error.message}</p>}

      <div className="list">
        {(retos ?? []).length === 0 && (
          <div className="card empty">
            No hay retos próximos con esos filtros. <Link href="/publicar">Lanza el primero</Link>.
          </div>
        )}
        {(retos ?? []).map((r) => (
          <Link key={r.id} id={`p-${r.id}`} href={`/reto/${r.id}`} className="card reto" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            <div className="versus">
              <div className="lado"><LogoEquipo equipo={r.fijo} tam={56} /><b>{r.fijo?.nombre}</b></div>
              <span className="vs">VS</span>
              <div className="lado">
                {r.rival ? <><LogoEquipo equipo={r.rival} tam={56} /><b>{r.rival.nombre}</b></>
                  : <><span className="sin-rival">?</span><span className="chip need">Busca rival</span></>}
              </div>
            </div>
            <div className="meta">
              <span><b>{fechaLima(r.fecha_hora)}</b></span>
              <span><b>{r.distrito}</b> · {r.cancha}, {r.direccion}</span>
              <span>S/ {Number(r.costo_por_jugador).toFixed(2)} por jugador</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
