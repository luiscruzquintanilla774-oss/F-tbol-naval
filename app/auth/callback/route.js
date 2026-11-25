import { NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/server';

// El enlace del correo de confirmación llega aquí
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/perfil`);
  }
  // Si se abrió en otro dispositivo, el correo igual queda confirmado: solo falta ingresar
  return NextResponse.redirect(`${origin}/login?confirmado=1`);
}
