import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import Ficha from '@/components/Ficha';
import SubirFoto from '@/components/SubirFoto';

export const dynamic = 'force-dynamic';

export default async function MiPerfil() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: jugador }, { data: privado }, { data: faltas }] = await Promise.all([
    supabase.from('jugadores_publico').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('perfiles').select('telefono').eq('id', user.id).maybeSingle(),
    supabase.from('denuncias').select('tipo, creado_en').eq('denunciado_id', user.id).eq('estado', 'confirmada'),
  ]);

  if (!jugador) {
    return <p className="note">Tu perfil aún no está listo. Cierra sesión y vuelve a ingresar en unos segundos.</p>;
  }

  return (
    <Ficha
      jugador={jugador}
      faltas={faltas ?? []}
      extra={<><span>{user.email}</span><span>{privado?.telefono}</span></>}
    >
      <SubirFoto usuarioId={user.id} />
    </Ficha>
  );
}
