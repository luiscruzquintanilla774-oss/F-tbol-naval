'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { DISTRITOS } from '@/lib/datos';
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
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [alineacion, setAlineacion] = useState({ equipoId: '', jugadores: [] });

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    if (!f.get('fecha') || !f.get('hora')) return setError('Elige la fecha y la hora del partido.');
    const fechaHora = `${f.get('fecha')}T${f.get('hora')}:00-05:00`; // hora de Lima
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
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Lanzar un reto</h1>
          <p>Elige tu equipo, tus 7 titulares y dónde juegan. Otro equipo de 7 o más podrá aceptar el reto.</p>
        </div>
      </div>
      <form className="card grid" onSubmit={enviar}>
        <div className="full"><SelectorAlineacion onChange={setAlineacion} /></div>
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
        {error && <p className="full err" role="alert">{error}</p>}
        <div className="full"><button className="btn" type="submit" disabled={cargando}>{cargando ? 'Lanzando…' : 'Lanzar reto'}</button></div>
      </form>
    </>
  );
}
