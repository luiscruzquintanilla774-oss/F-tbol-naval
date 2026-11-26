import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import { nombrePosicion } from '@/lib/datos';

export const dynamic = 'force-dynamic';

export default async function Admin() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: esAdmin } = await supabase.rpc('es_admin');
  if (!esAdmin) notFound();

  const { data: usuarios, error } = await supabase.rpc('admin_usuarios');

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Administración</h1>
          <p>Datos privados de los usuarios. Solo los administradores pueden ver esta página.</p>
        </div>
      </div>
      {error && <p className="err">{error.message}</p>}
      <div className="card tablewrap">
        <table>
          <thead>
            <tr><th>Alias</th><th>Nombre completo</th><th>Correo</th><th>Teléfono</th><th>Posición</th><th>Distrito</th><th>Registro</th></tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u) => (
              <tr key={u.id}>
                <td><b>{u.alias ?? '—'}</b>{u.es_admin ? ' (admin)' : ''}</td>
                <td>{u.nombre_completo}</td>
                <td>{u.correo}</td>
                <td>{u.telefono}</td>
                <td>{nombrePosicion(u.posicion)}</td>
                <td>{u.distrito}</td>
                <td>{new Date(u.registrado_en).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Total: {(usuarios ?? []).length} usuarios.</p>
    </>
  );
}
