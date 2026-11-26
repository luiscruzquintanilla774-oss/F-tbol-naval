import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import Ficha from '@/components/Ficha';
import SubirFoto from '@/components/SubirFoto';
import FijarAlias from '@/components/FijarAlias';

export const dynamic = 'force-dynamic';

export default async function MiPerfil() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: jugador }, { data: privado }, { data: faltas }] = await Promise.all([
    supabase.from('jugadores_publico').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('perfiles').select('telefono, nombre_completo').eq('id', user.id).maybeSingle(),
    supabase.from('denuncias').select('tipo, creado_en').eq('denunciado_id', user.id).eq('estado', 'confirmada'),
  ]);

  if (!jugador) {
    return <p className="note">Tu perfil aún no está listo. Cierra sesión y vuelve a ingresar en unos segundos.</p>;
  }

  return (
    <>
    {!jugador.alias && <FijarAlias />}
    <Ficha
      jugador={jugador}
      faltas={faltas ?? []}
      extra={<><span>{privado?.nombre_completo} (privado)</span><span>{user.email}</span><span>{privado?.telefono}</span></>}
    >
      <SubirFoto usuarioId={user.id} />
    </Ficha>
    <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Tu nombre completo, correo y teléfono no los ven los demás jugadores. El teléfono solo lo ven los integrantes de tus equipos.</p>
    </>
  );
}
