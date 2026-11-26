'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';

// Botón que llama a una función de Supabase y recarga la página.
// Con "confirmar", pide un segundo clic antes de ejecutar.
export default function BotonRpc({ fn, args, children, className = 'btn', confirmar = null, irA = null }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [preguntando, setPreguntando] = useState(false);

  async function ejecutar() {
    setCargando(true);
    setError('');
    const { error } = await crearClienteNavegador().rpc(fn, args);
    setCargando(false);
    setPreguntando(false);
    if (error) return setError(error.message);
    if (irA) router.push(irA);
    router.refresh();
  }

  if (preguntando) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        {confirmar}
        <button className="btn warn" style={{ padding: '4px 10px' }} disabled={cargando} onClick={ejecutar}>Sí</button>
        <button className="btn ghost" style={{ padding: '4px 10px' }} onClick={() => setPreguntando(false)}>No</button>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-grid', gap: 4 }}>
      <button className={className} disabled={cargando} onClick={() => (confirmar ? setPreguntando(true) : ejecutar())}>
        {cargando ? '…' : children}
      </button>
      {error && <small className="err">{error}</small>}
    </span>
  );
}
