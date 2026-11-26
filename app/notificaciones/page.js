import Link from 'next/link';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import MarcarLeidas from '@/components/MarcarLeidas';

export const dynamic = 'force-dynamic';

const hace = (fecha) =>
  new Date(fecha).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function Notificaciones() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: lista, error } = await supabase
    .from('notificaciones')
    .select('id, mensaje, enlace, leida, creado_en')
    .order('creado_en', { ascending: false })
    .limit(50);
  const hayNuevas = (lista ?? []).some((n) => !n.leida);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Notificaciones</h1>
          <p>Solicitudes de amistad, de equipos y de partidos, y partidos nuevos en tu distrito o de tus amigos.</p>
        </div>
      </div>
      {error && <p className="err">No se pudieron cargar: {error.message}</p>}
      {hayNuevas && <MarcarLeidas />}
      <div className="list">
        {(lista ?? []).length === 0 && <div className="card empty">Aún no tienes notificaciones.</div>}
        {(lista ?? []).map((n) => (
          <Link key={n.id} href={n.enlace ?? '/'} className="card notif" data-nueva={!n.leida || undefined}>
            <span>{n.mensaje}</span>
            <small>{hace(n.creado_en)}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
