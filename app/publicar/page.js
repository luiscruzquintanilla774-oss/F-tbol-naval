'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { DISTRITOS, POSICIONES } from '@/lib/datos';
import SelectorAlineacion from '@/components/SelectorAlineacion';

// Horas de 06:00 a 23:30, cada 30 minutos
const HORAS = Array.from({ length: 36 }, (_, i) => {
  const h = String(6 + Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});
// Fecha de hoy en Lima (AAAA-MM-DD)
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export default function Publicar() {
  const router = useRouter();
  const [tipo, setTipo] = useState('faltan_jugadores');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [alineacion, setAlineacion] = useState({ equipoId: '', jugadores: [] });
  const [faltantes, setFaltantes] = useState(2);

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    if (!f.get('fecha') || !f.get('hora')) return setError('Elige la fecha y la hora del partido.');
    const posiciones = f.getAll('posiciones');
    if (tipo === 'faltan_jugadores' && (posiciones.length !== faltantes || posiciones.some((x) => !x)))
      return setError('Elige una posición para cada jugador que falta.');
    const fechaHora = `${f.get('fecha')}T${f.get('hora')}:00-05:00`; // hora de Lima
    if (tipo === 'reto') {
      if (!alineacion.equipoId) return setError('Elige tu equipo.');
      if (alineacion.jugadores.length !== 7) return setError('Elige exactamente 7 titulares.');
      setCargando(true);
      const { data, error } = await crearClienteNavegador().rpc('crear_reto', {
        p_equipo_fijo: alineacion.equipoId,
        p_distrito: f.get('distrito'),
        p_cancha: f.get('cancha').trim(),
        p_direccion: f.get('direccion').trim(),
        p_fecha_hora: fechaHora,
        p_costo: Number(f.get('costo') || 0),
        p_jugadores: alineacion.jugadores,
      });
      setCargando(false);
      if (error) return setError(error.message);
      router.push(`/reto/${data}`);
      router.refresh();
      return;
    }
    setCargando(true);
    const { error } = await crearClienteNavegador().rpc('crear_publicacion', {
      p_tipo: tipo,
      p_equipo: f.get('equipo').trim(),
      p_distrito: f.get('distrito'),
      p_cancha: f.get('cancha').trim(),
      p_direccion: f.get('direccion').trim(),
      p_fecha_hora: fechaHora,
      p_costo: Number(f.get('costo') || 0),
      p_faltantes: faltantes,
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
            <option value="reto">Lanzar reto con mi equipo (7 jugadores)</option>
          </select>
        </label>
        {tipo === 'faltan_jugadores' && (
          <label>Nombre del equipo<input id="equipo" name="equipo" type="text" required maxLength={40} /></label>
        )}
        {tipo === 'reto' && (
          <div className="full"><SelectorAlineacion onChange={setAlineacion} /></div>
        )}
        <label>Distrito
          <select id="distrito" name="distrito" defaultValue="Miraflores">
            {DISTRITOS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Nombre de la cancha<input id="cancha" name="cancha" type="text" required maxLength={60} placeholder="Ej. Complejo Deportivo El Golazo" /></label>
        <label className="full">Dirección de la cancha<input id="direccion" name="direccion" type="text" required maxLength={100} placeholder="Ej. Av. Primavera 1234" /></label>
        <label>Fecha<input id="fecha" name="fecha" type="date" required min={hoyLima()} /></label>
        <label>Hora
          <select id="hora" name="hora" defaultValue="20:00" required>
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label>Costo por jugador (S/)<input id="costo" name="costo" type="number" min="0" max="200" step="0.5" defaultValue="15" /></label>
        {tipo === 'faltan_jugadores' && (
          <>
            <label>¿Cuántos jugadores faltan?
              <select id="faltantes" value={faltantes} onChange={(e) => setFaltantes(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Conducta mínima exigida (0 a 10)<input id="conducta" name="conducta" type="number" min="0" max="10" step="0.5" defaultValue="6" /></label>
            <fieldset className="full" style={{ border: '1px solid var(--line)', borderRadius: 8, display: 'grid', gap: 8 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Posición de cada jugador que falta</legend>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {Array.from({ length: faltantes }, (_, i) => (
                  <label key={i}>Jugador {i + 1}
                    <select name="posiciones" defaultValue="" required>
                      <option value="" disabled>Elige una posición</option>
                      {POSICIONES.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}
                    </select>
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
