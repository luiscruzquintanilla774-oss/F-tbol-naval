'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { ALIAS_VALIDO } from '@/lib/datos';

// Para quienes se registraron antes de que existiera el alias
export default function FijarAlias() {
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (!ALIAS_VALIDO.test(alias.trim())) return setError('De 3 a 20 caracteres: letras, números o guion bajo, sin espacios.');
    setCargando(true);
    const { error } = await crearClienteNavegador().rpc('fijar_alias', { p_alias: alias.trim() });
    setCargando(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <form className="card" onSubmit={guardar} style={{ borderColor: 'var(--flag)' }}>
      <h2 style={{ fontSize: 22 }}>Elige tu alias</h2>
      <p style={{ margin: 0 }}>Es el nombre con el que te verán los demás jugadores. <b>Solo puedes elegirlo una vez y no se podrá cambiar.</b></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input id="alias" type="text" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={20}
          placeholder="Ej. ElMuro_10" aria-label="Alias" style={{ maxWidth: 260 }} />
        <button className="btn" type="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar alias'}</button>
      </div>
      {error && <p className="err" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
