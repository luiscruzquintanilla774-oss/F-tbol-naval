'use client';
import { useState } from 'react';
import Link from 'next/link';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { ALIAS_VALIDO, DISTRITOS, POSICIONES } from '@/lib/datos';

export default function Registro() {
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nombre = f.get('nombre').trim().replace(/\s+/g, ' ');
    const email = f.get('email').trim().toLowerCase();
    const telefono = f.get('telefono').trim();
    const clave = f.get('clave');
    const alias = f.get('alias').trim();
    setError('');

    if (!ALIAS_VALIDO.test(alias)) return setError('El alias debe tener de 3 a 20 caracteres: letras, números o guion bajo, sin espacios.');
    if (nombre.split(' ').length < 2) return setError('Escribe tu nombre y apellido.');
    if (!/^9\d{8}$/.test(telefono)) return setError('El teléfono debe tener 9 dígitos y empezar con 9.');
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!f.get('acepto')) return setError('Para registrarte debes aceptar el uso de tus datos.');

    setCargando(true);
    const supabase = crearClienteNavegador();
    const { data: aliasLibre } = await supabase.rpc('alias_disponible', { p_alias: alias });
    if (aliasLibre === false) {
      setCargando(false);
      return setError('Ese alias ya lo usa otro jugador. Elige otro.');
    }
    const { data: libre } = await supabase.rpc('telefono_disponible', { p_telefono: telefono });
    if (libre === false) {
      setCargando(false);
      return setError('Este teléfono ya está registrado en otra cuenta.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: clave,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { nombre_completo: nombre, alias, telefono, posicion: f.get('posicion'), distrito: f.get('distrito'), acepto_datos: 'si' },
      },
    });
    setCargando(false);
    if (error) {
      if (/rate limit/i.test(error.message)) return setError('Hay muchos registros en este momento y no pudimos enviar el correo de confirmación. Inténtalo de nuevo en una hora.');
      if (/already registered/i.test(error.message)) return setError('Este correo ya tiene una cuenta. Ingresa con él o usa otro correo.');
      if (/database error/i.test(error.message)) return setError('No se pudo crear la cuenta. Revisa que el alias y el teléfono no estén registrados.');
      return setError(error.message);
    }
    // Supabase no avisa el correo repetido por seguridad: lo detectamos así
    if (data.user && data.user.identities?.length === 0) {
      return setError('Este correo ya tiene una cuenta. Ingresa con él o usa otro correo.');
    }
    setListo(email);
  }

  if (listo) {
    return (
      <div className="card">
        <h1 style={{ fontSize: 30 }}>Revisa tu correo</h1>
        <p>Enviamos un enlace a <b>{listo}</b>. Ábrelo para activar tu cuenta y luego ingresa. Si no lo ves, revisa la carpeta de spam.</p>
        <Link className="btn" href="/login">Ir a ingresar</Link>
      </div>
    );
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Crear cuenta</h1>
          <p>Un correo y un teléfono por persona. Los demás jugadores solo verán tu alias. Podrás subir tu foto después de ingresar.</p>
        </div>
      </div>
      <form className="card grid" onSubmit={enviar}>
        <label className="full">Alias (es tu nombre en la web y <b>no se podrá cambiar</b>)<input id="alias" name="alias" type="text" required minLength={3} maxLength={20} placeholder="Ej. ElMuro_10" autoComplete="nickname" /></label>
        <label className="full">Nombre completo (privado)<input id="nombre" name="nombre" type="text" required maxLength={80} autoComplete="name" /></label>
        <label>Correo electrónico (privado)<input id="email" name="email" type="email" required autoComplete="email" /></label>
        <label>Teléfono (solo lo ve tu equipo)<input id="telefono" name="telefono" type="tel" required inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" /></label>
        <label>Contraseña (mínimo 8)<input id="clave" name="clave" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label>Posición
          <select id="posicion" name="posicion">{POSICIONES.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}</select>
        </label>
        <label className="full">Distrito donde juegas
          <select id="distrito" name="distrito">{DISTRITOS.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <label className="full" style={{ display: 'flex', gap: 8, alignItems: 'start', fontWeight: 500, color: 'var(--ink)' }}>
          <input type="checkbox" name="acepto" value="si" style={{ marginTop: 4 }} />
          <span>Acepto que Fútbol Naval guarde mis datos para usar la web. Mi nombre completo y mi correo solo los verán los administradores, y mi teléfono solo los jugadores de mis equipos. Puedo pedir que borren mis datos en cualquier momento.</span>
        </label>
        {error && <p className="full err" role="alert">{error}</p>}
        <div className="full"><button className="btn" type="submit" disabled={cargando}>{cargando ? 'Creando cuenta…' : 'Registrarme'}</button></div>
      </form>
    </>
  );
}
