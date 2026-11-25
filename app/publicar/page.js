'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { DISTRITOS, POSICIONES } from '@/lib/datos';

export default function Publicar() {
  const router = useRouter();
  const [tipo, setTipo] = useState('faltan_jugadores');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    if (!f.get('fecha')) return setError('Elige la fecha y hora del partido.');
    const posiciones = f.getAll('posiciones');
    if (tipo === 'faltan_jugadores' && posiciones.length === 0) return setError('Marca al menos una posición que buscas.');
    setCargando(true);
    const { error } = await crearClienteNavegador().rpc('crear_publicacion', {
      p_tipo: tipo,
      p_equipo: f.get('equipo').trim(),
      p_distrito: f.get('distrito'),
      p_cancha: f.get('cancha').trim(),
      p_direccion: f.get('direccion').trim(),
      p_fecha_hora: `${f.get('fecha')}:00-05:00`, // hora de Lima
      p_costo: Number(f.get('costo') || 0),
      p_faltantes: Number(f.get('faltantes') || 0),
      p_conducta_minima: Number(f.get('conducta') || 0),
      p_posiciones: tipo === 'reto' ? [] : posiciones,
    });
    setCargando(false);
    if (error) return setError(error.message);
    router.push(`/?distrito=${encodeURIComponent(f.get('distrito'))}`);
    router.refresh();
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Publicar partido</h1>
          <p>Indica el distrito y la dirección para que te encuentren jugadores o rivales cercanos.</p>
        </div>
      </div>
      <form className="card grid" onSubmit={enviar}>
        <label>Tipo de publicación
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="faltan_jugadores">Me faltan jugadores</option>
            <option value="reto">Mi equipo está completo: lanzar reto</option>
          </select>
        </label>
        <label>Nombre del equipo<input id="equipo" name="equipo" type="text" required maxLength={40} /></label>
        <label>Distrito
          <select id="distrito" name="distrito" defaultValue="Miraflores">
            {DISTRITOS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Nombre de la cancha<input id="cancha" name="cancha" type="text" required maxLength={60} placeholder="Ej. Complejo Deportivo El Golazo" /></label>
        <label className="full">Dirección de la cancha<input id="direccion" name="direccion" type="text" required maxLength={100} placeholder="Ej. Av. Primavera 1234" /></label>
        <label>Fecha y hora<input id="fecha" name="fecha" type="datetime-local" required /></label>
        <label>Costo por jugador (S/)<input id="costo" name="costo" type="number" min="0" max="200" step="0.5" defaultValue="15" /></label>
        {tipo === 'faltan_jugadores' && (
          <>
            <label>¿Cuántos jugadores faltan?<input id="faltantes" name="faltantes" type="number" min="1" max="6" defaultValue="2" /></label>
            <label>Conducta mínima exigida (0 a 10)<input id="conducta" name="conducta" type="number" min="0" max="10" step="0.5" defaultValue="6" /></label>
            <fieldset className="full" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Posiciones que buscas</legend>
              <div className="chips">
                {POSICIONES.map((p) => (
                  <label key={p.valor} style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 500, color: 'var(--ink)' }}>
                    <input type="checkbox" name="posiciones" value={p.valor} /> {p.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {error && <p className="full err" role="alert">{error}</p>}
        <div className="full"><button className="btn" type="submit" disabled={cargando}>{cargando ? 'Publicando…' : 'Publicar'}</button></div>
      </form>
    </>
  );
}
