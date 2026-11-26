'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import SelectorAlineacion from '@/components/SelectorAlineacion';

export default function AceptarReto({ publicacionId, equipoRetador }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState({ equipoId: '', jugadores: [] });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function aceptar() {
    setError('');
    if (!sel.equipoId) return setError('Elige tu equipo.');
    if (sel.jugadores.length !== 7) return setError('Elige exactamente 7 titulares.');
    setCargando(true);
    const { error } = await crearClienteNavegador().rpc('aceptar_reto_equipo', {
      p_publicacion: publicacionId, p_equipo_fijo: sel.equipoId, p_jugadores: sel.jugadores,
    });
    setCargando(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  if (!abierto) return <button className="btn" onClick={() => setAbierto(true)}>Aceptar el reto con mi equipo</button>;
  return (
    <div className="card" style={{ borderColor: 'var(--flag)' }}>
      <h2 style={{ fontSize: 22 }}>Aceptar el reto</h2>
      <SelectorAlineacion onChange={setSel} excluir={[equipoRetador]} />
      {error && <p className="err" style={{ margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={cargando || sel.jugadores.length !== 7} onClick={aceptar}>{cargando ? 'Aceptando…' : 'Confirmar reto'}</button>
        <button className="btn ghost" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </div>
  );
}
