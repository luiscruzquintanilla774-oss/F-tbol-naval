'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { nombrePosicion } from '@/lib/datos';

export default function Acciones({ publicacion: p, enEquipo, esCapitan, miConducta }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [verReto, setVerReto] = useState(false);
  const [contactos, setContactos] = useState(null);

  async function llamar(funcion, args) {
    setCargando(true);
    setError('');
    const { error } = await crearClienteNavegador().rpc(funcion, args);
    setCargando(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function verContactos() {
    const { data, error } = await crearClienteNavegador().rpc('contactos_equipo', { p_equipo: p.equipoId });
    if (error) setError(error.message);
    else setContactos(data);
  }

  const bajaConducta = miConducta < p.conductaMinima;

  return (
    <div className="actions">
      {p.tipo === 'faltan_jugadores' && !enEquipo && (
        <>
          <button className="btn" disabled={cargando || bajaConducta || p.faltantes <= 0}
            onClick={() => llamar('unirse', { p_publicacion: p.id })}>
            {p.faltantes <= 0 ? 'Equipo completo' : 'Unirme al equipo'}
          </button>
          {bajaConducta && <small className="err">Requiere conducta {p.conductaMinima.toFixed(1)} o más</small>}
        </>
      )}
      {p.tipo === 'faltan_jugadores' && enEquipo && !esCapitan && (
        <button className="btn ghost" disabled={cargando} onClick={() => llamar('salir', { p_publicacion: p.id })}>
          Salir del equipo
        </button>
      )}
      {p.tipo === 'reto' && p.rival && <span className="chip need">Reto aceptado por {p.rival}</span>}
      {p.tipo === 'reto' && !p.rival && !enEquipo && !verReto && (
        <button className="btn" onClick={() => setVerReto(true)}>Aceptar reto</button>
      )}
      {verReto && (
        <>
          <input type="text" placeholder="Nombre de tu equipo" maxLength={40} value={nombreEquipo}
            onChange={(e) => setNombreEquipo(e.target.value)} aria-label="Nombre de tu equipo" />
          <button className="btn" disabled={cargando}
            onClick={() => llamar('aceptar_reto', { p_publicacion: p.id, p_equipo: nombreEquipo })}>
            Confirmar reto
          </button>
        </>
      )}
      {enEquipo && !contactos && (
        <button className="btn ghost" onClick={verContactos}>Ver teléfonos del equipo</button>
      )}
      {contactos && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
          {contactos.map((c) => (
            <li key={c.telefono}>{c.nombre_completo} ({nombrePosicion(c.posicion)}): <b>{c.telefono}</b></li>
          ))}
        </ul>
      )}
      {error && <small className="err">{error}</small>}
    </div>
  );
}
