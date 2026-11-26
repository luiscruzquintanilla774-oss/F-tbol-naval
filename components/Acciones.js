'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { nombrePosicion, uno } from '@/lib/datos';

export default function Acciones({ publicacion: p, enEquipo, esCapitan, miConducta, miSolicitud, pendientes = [] }) {
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
  const buscaJugadores = p.tipo === 'faltan_jugadores';

  return (
    <div className="actions">
      {/* Jugador que no está en el equipo */}
      {buscaJugadores && !enEquipo && miSolicitud === null && (
        <>
          <button className="btn" disabled={cargando || bajaConducta || p.faltantes <= 0}
            onClick={() => llamar('solicitar_unirse', { p_publicacion: p.id })}>
            {p.faltantes <= 0 ? 'Equipo completo' : 'Solicitar unirme'}
          </button>
          {bajaConducta && <small className="err">Requiere conducta {p.conductaMinima.toFixed(1)} o más</small>}
        </>
      )}
      {buscaJugadores && !enEquipo && miSolicitud === 'pendiente' && (
        <>
          <span className="chip">Solicitud enviada. Espera al capitán.</span>
          <button className="btn ghost" disabled={cargando} onClick={() => llamar('cancelar_solicitud', { p_publicacion: p.id })}>
            Cancelar solicitud
          </button>
        </>
      )}
      {buscaJugadores && !enEquipo && miSolicitud === 'rechazada' && (
        <span className="chip" style={{ color: 'var(--danger)' }}>El capitán no aceptó tu solicitud</span>
      )}
      {buscaJugadores && enEquipo && !esCapitan && (
        <button className="btn ghost" disabled={cargando} onClick={() => llamar('salir', { p_publicacion: p.id })}>
          Salir del equipo
        </button>
      )}

      {/* Capitán: solicitudes por responder */}
      {esCapitan && pendientes.length > 0 && (
        <div style={{ display: 'grid', gap: 6, border: '1px solid var(--flag)', borderRadius: 8, padding: 8 }}>
          <b style={{ fontSize: 13 }}>Solicitudes ({pendientes.length})</b>
          {pendientes.map((s) => (
            <div key={s.id} style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>
                <Link href={`/jugador/${s.jugador?.id}`}>{s.jugador?.alias ?? 'Jugador'}</Link>
                {s.jugador && <> · {nombrePosicion(s.jugador.posicion)} · conducta <b className="score">{uno(s.jugador.conducta)}</b>
                  {s.jugador.medalla != null && <> · medalla <b className="score">{uno(s.jugador.medalla)}</b></>}</>}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ padding: '4px 10px' }} disabled={cargando}
                  onClick={() => llamar('responder_solicitud', { p_solicitud: s.id, p_aceptar: true })}>Aceptar</button>
                <button className="btn ghost" style={{ padding: '4px 10px' }} disabled={cargando}
                  onClick={() => llamar('responder_solicitud', { p_solicitud: s.id, p_aceptar: false })}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retos */}
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

      {/* Integrantes: teléfonos */}
      {enEquipo && !contactos && (
        <button className="btn ghost" onClick={verContactos}>Ver teléfonos del equipo</button>
      )}
      {contactos && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
          {contactos.map((c) => (
            <li key={c.telefono}>{c.alias ?? 'Sin alias'} ({nombrePosicion(c.posicion)}): <b>{c.telefono}</b></li>
          ))}
        </ul>
      )}
      {error && <small className="err">{error}</small>}
    </div>
  );
}
