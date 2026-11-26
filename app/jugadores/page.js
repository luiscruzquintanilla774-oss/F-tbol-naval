import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import FilaJugador from '@/components/FilaJugador';
import BotonAmistad from '@/components/BotonAmistad';

export const dynamic = 'force-dynamic';

export default async function Jugadores({ searchParams }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const q = ((await searchParams)?.q ?? '').trim();
  const { data: resultados, error } = q.length >= 2
    ? await supabase.rpc('buscar_jugadores', { p_texto: q })
    : { data: null, error: null };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Buscar jugadores</h1>
          <p>Busca por alias y agrega a los que conoces como amigos.</p>
        </div>
      </div>
      <form className="filters" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Escribe un alias (mínimo 2 letras)" aria-label="Alias" style={{ maxWidth: 360 }} />
        <button className="btn" type="submit">Buscar</button>
      </form>
      {error && <p className="err">{error.message}</p>}
      {resultados && (
        <div className="card" style={{ gap: 0 }}>
          {resultados.length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>No encontramos jugadores con “{q}”.</p>}
          {resultados.map((j) => (
            <FilaJugador key={j.id} j={j} detalle={j.en_comun > 0 ? `${j.en_comun} ${j.en_comun === 1 ? 'amigo' : 'amigos'} en común` : null}>
              <BotonAmistad jugadorId={j.id} estado={j.estado} />
            </FilaJugador>
          ))}
        </div>
      )}
    </>
  );
}
