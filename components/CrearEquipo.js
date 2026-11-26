'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { subirImagen } from '@/lib/subirImagen';

export default function CrearEquipo() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function elegir(e) {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f);
    setVista(f ? URL.createObjectURL(f) : '');
  }

  async function crear(e) {
    e.preventDefault();
    setError('');
    if (nombre.trim().length < 3) return setError('El nombre debe tener al menos 3 letras.');
    if (!archivo) return setError('Sube el logo de tu equipo.');
    setCargando(true);
    try {
      const logo = await subirImagen(archivo, 'logo');
      const { data, error } = await crearClienteNavegador().rpc('crear_equipo_fijo', { p_nombre: nombre.trim(), p_logo_url: logo });
      if (error) throw error;
      router.push(`/equipos/${data}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setCargando(false);
    }
  }

  return (
    <form className="card" onSubmit={crear}>
      <h2 style={{ fontSize: 22 }}>Crear un equipo</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ cursor: 'pointer', display: 'grid', placeItems: 'center', width: 72, height: 72, borderRadius: '50%', border: '2px dashed var(--line)', overflow: 'hidden', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {vista ? <img src={vista} alt="Logo elegido" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Subir logo'}
          <input type="file" accept="image/*" onChange={elegir} style={{ position: 'absolute', opacity: 0, width: 1 }} aria-label="Logo del equipo" />
        </label>
        <input id="nombreEquipo" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40}
          placeholder="Nombre del equipo" aria-label="Nombre del equipo" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear equipo'}</button>
      </div>
      <small style={{ color: 'var(--muted)' }}>El logo y el nombre representan a tu equipo en los retos. Serás el capitán y podrás pasarle la capitanía a otro integrante.</small>
      {error && <small className="err">{error}</small>}
    </form>
  );
}
