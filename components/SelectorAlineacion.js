'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { nombrePosicion, uno } from '@/lib/datos';

// Elegir uno de mis equipos (7+ integrantes) y sus 7 titulares
export default function SelectorAlineacion({ onChange, excluir = [] }) {
  const [equipos, setEquipos] = useState(null);
  const [equipoId, setEquipoId] = useState('');
  const [miembros, setMiembros] = useState([]);
  const [elegidos, setElegidos] = useState([]);

  useEffect(() => {
    (async () => {
      const sb = crearClienteNavegador();
      const { data: { user } } = await sb.auth.getUser();
      const { data } = await sb.from('equipo_fijo_miembros')
        .select('equipo:equipos_fijos ( id, nombre, equipo_fijo_miembros ( estado ) )')
        .eq('jugador_id', user.id).eq('estado', 'miembro');
      const lista = (data ?? []).map((d) => ({
        id: d.equipo.id, nombre: d.equipo.nombre,
        total: d.equipo.equipo_fijo_miembros.filter((m) => m.estado === 'miembro').length,
      })).filter((e) => !excluir.includes(e.id));
      setEquipos(lista);
      const primero = lista.find((e) => e.total >= 7);
      if (primero) setEquipoId(primero.id);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!equipoId) return;
    (async () => {
      const sb = crearClienteNavegador();
      const { data: filas } = await sb.from('equipo_fijo_miembros').select('jugador_id').eq('equipo_id', equipoId).eq('estado', 'miembro');
      const ids = (filas ?? []).map((f) => f.jugador_id);
      const { data: jug } = await sb.from('jugadores_publico').select('id, alias, posicion, medalla, conducta').in('id', ids);
      const orden = { arquero: 0, defensa: 1, mediocampista: 2, delantero: 3 };
      const lista = (jug ?? []).sort((a, b) => orden[a.posicion] - orden[b.posicion]);
      setMiembros(lista);
      const iniciales = lista.length <= 7 ? lista.map((j) => j.id) : [];
      setElegidos(iniciales);
    })();
  }, [equipoId]);

  useEffect(() => { onChange({ equipoId, jugadores: elegidos }); }, [equipoId, elegidos]); // eslint-disable-line react-hooks/exhaustive-deps

  if (equipos === null) return <p style={{ margin: 0, color: 'var(--muted)' }}>Cargando tus equipos…</p>;
  if (equipos.length === 0) {
    return <p className="note" style={{ margin: 0 }}>Para retar necesitas un equipo registrado con al menos 7 integrantes. <Link href="/equipos">Crea o completa tu equipo</Link>.</p>;
  }
  const actual = equipos.find((e) => e.id === equipoId);

  function alternar(id) {
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 7 ? [...prev, id] : prev));
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Tu equipo
        <select id="equipoFijo" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
          <option value="" disabled>Elige un equipo</option>
          {equipos.map((e) => (
            <option key={e.id} value={e.id} disabled={e.total < 7}>{e.nombre} ({e.total} integrantes{e.total < 7 ? ', le faltan ' + (7 - e.total) : ''})</option>
          ))}
        </select>
      </label>
      {!actual && <p className="note" style={{ margin: 0 }}>Ninguno de tus equipos tiene 7 integrantes todavía. <Link href="/equipos">Completa tu equipo</Link>.</p>}
      {actual && (
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, display: 'grid', gap: 4 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Titulares: {elegidos.length} de 7</legend>
          {miembros.map((j) => (
            <label key={j.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={elegidos.includes(j.id)} onChange={() => alternar(j.id)}
                disabled={!elegidos.includes(j.id) && elegidos.length >= 7} />
              <b>{j.alias}</b> · {nombrePosicion(j.posicion)} · {j.medalla == null ? 'sin calificación' : `medalla ${uno(j.medalla)}`}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
