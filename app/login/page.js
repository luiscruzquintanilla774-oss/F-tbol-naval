'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

function Formulario() {
  const router = useRouter();
  const confirmado = useSearchParams().get('confirmado');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    setCargando(true);
    const { error } = await crearClienteNavegador().auth.signInWithPassword({
      email: f.get('email').trim().toLowerCase(),
      password: f.get('clave'),
    });
    setCargando(false);
    if (error) {
      if (/not confirmed/i.test(error.message)) return setError('Aún no confirmas tu correo. Abre el enlace que te enviamos.');
      if (/invalid login/i.test(error.message)) return setError('Correo o contraseña incorrectos.');
      return setError(error.message);
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form className="card grid" onSubmit={enviar} style={{ maxWidth: 520 }}>
      {confirmado && <p className="full note">Tu correo quedó confirmado. Ya puedes ingresar.</p>}
      <label className="full">Correo electrónico<input id="email" name="email" type="email" required autoComplete="email" /></label>
      <label className="full">Contraseña<input id="clave" name="clave" type="password" required autoComplete="current-password" /></label>
      {error && <p className="full err" role="alert">{error}</p>}
      <div className="full" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
        <span>¿No tienes cuenta? <Link href="/registro">Regístrate</Link></span>
      </div>
    </form>
  );
}

export default function Login() {
  return (
    <>
      <div className="pagehead"><div><h1>Ingresar</h1></div></div>
      <Suspense><Formulario /></Suspense>
    </>
  );
}
