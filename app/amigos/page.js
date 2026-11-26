import Link from 'next/link';
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

export default async function Amigos() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await supabase.rpc('mis_amistades');
  const todos = data ?? [];
  const recibidas = todos.filter((j) => j.estado === 'recibida');

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Mis amigos</h1>
          <p>Tus amigos pueden pedir unirse a tus equipos, y tú puedes invitarlos.</p>
        </div>
        <Link className="btn" href="/jugadores">Buscar jugadores</Link>
      </div>
      {error && <p className="err">{error.message}</p>}
      {recibidas.length > 0 && <Seccion titulo="Solicitudes recibidas" lista={recibidas} vacio="" />}
      <Seccion titulo="Amigos" lista={todos.filter((j) => j.estado === 'amigos')} vacio="Aún no tienes amigos. Búscalos por su alias." />
      <Seccion titulo="Solicitudes enviadas" lista={todos.filter((j) => j.estado === 'enviada')} vacio="No tienes solicitudes enviadas." />
    </>
  );
}
