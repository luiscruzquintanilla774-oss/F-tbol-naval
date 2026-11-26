import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import FilaJugador from '@/components/FilaJugador';
import BotonAmistad from '@/components/BotonAmistad';

export const dynamic = 'force-dynamic';

function Seccion({ titulo, lista, vacio }) {
  return (
    <div className="card" style={{ gap: 0 }}>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>{titulo} ({lista.length})</h2>
      {lista.length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>{vacio}</p>}
      {lista.map((j) => (
        <FilaJugador key={j.id} j={j}><BotonAmistad jugadorId={j.id} estado={j.estado} /></FilaJugador>
      ))}
    </div>
  );
}

export default async function Amigos({ searchParams }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await supabase.rpc('mis_amistades');
  const todos = data ?? [];
  const recibidas = todos.filter((j) => j.estado === 'recibida');
  const q = ((await searchParams)?.q ?? '').trim();
  const { data: resultados, error: errorBusqueda } = q.length >= 2
    ? await supabase.rpc('buscar_jugadores', { p_texto: q })
    : { data: null, error: null };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Amigos y jugadores</h1>
          <p>Busca jugadores por su alias y agrégalos. Tus amigos pueden pedir unirse a tus equipos, y tú puedes invitarlos.</p>
        </div>
      </div>
      <form className="filters" method="get" style={{ marginBottom: 12 }}>
        <input type="search" name="q" defaultValue={q} placeholder="Buscar jugador por alias (mínimo 2 letras)" aria-label="Alias" style={{ maxWidth: 360 }} />
        <button className="btn" type="submit">Buscar</button>
      </form>
      {errorBusqueda && <p className="err">{errorBusqueda.message}</p>}
      {resultados && (
        <div className="card" style={{ gap: 0 }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Resultados para “{q}”</h2>
          {resultados.length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>No encontramos jugadores con ese alias.</p>}
          {resultados.map((j) => (
            <FilaJugador key={j.id} j={j} detalle={j.en_comun > 0 ? `${j.en_comun} ${j.en_comun === 1 ? 'amigo' : 'amigos'} en común` : null}>
              <BotonAmistad jugadorId={j.id} estado={j.estado} />
            </FilaJugador>
          ))}
        </div>
      )}
      {error && <p className="err">{error.message}</p>}
      {recibidas.length > 0 && <Seccion titulo="Solicitudes recibidas" lista={recibidas} vacio="" />}
      <Seccion titulo="Amigos" lista={todos.filter((j) => j.estado === 'amigos')} vacio="Aún no tienes amigos. Búscalos por su alias arriba." />
      <Seccion titulo="Solicitudes enviadas" lista={todos.filter((j) => j.estado === 'enviada')} vacio="No tienes solicitudes enviadas." />
    </>
  );
}
