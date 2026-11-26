'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

export default function CrearEquipo() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function crear(e) {
    e.preventDefault();
    setError('');
    if (nombre.trim().length < 3) return setError('El nombre debe tener al menos 3 letras.');
    setCargando(true);
    const { data, error } = await crearClienteNavegador().rpc('crear_equipo_fijo', { p_nombre: nombre.trim() });
    setCargando(false);
    if (error) return setError(error.message);
    router.push(`/equipos/${data}`);
    router.refresh();
  }

  return (
    <form className="card" onSubmit={crear}>
      <h2 style={{ fontSize: 22 }}>Crear un equipo</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input id="nombreEquipo" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40}
          placeholder="Nombre del equipo" aria-label="Nombre del equipo" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear equipo'}</button>
      </div>
      <small style={{ color: 'var(--muted)' }}>Serás el capitán. Podrás invitar a tus amigos (máximo 12 integrantes).</small>
      {error && <small className="err">{error}</small>}
    </form>
  );
}
