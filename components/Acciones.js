'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { POSICIONES, nombrePosicion, uno } from '@/lib/datos';

export default function Acciones({ publicacion: p, miPosicion = null, enEquipo, esCapitan, miConducta, miSolicitud, pendientes = [] }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [contactos, setContactos] = useState(null);
  // Posiciones libres (sin repetir). null = cualquier posición (partidos antiguos)
  const cualquiera = (p.libres ?? []).includes(null);
  const opciones = cualquiera ? POSICIONES.map((x) => x.valor) : [...new Set(p.libres ?? [])];
  const [posicion, setPosicion] = useState(opciones.includes(miPosicion) ? miPosicion : opciones[0] ?? '');

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
          {p.faltantes > 0 && opciones.length > 0 && (
            <label style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Quiero jugar de
              <select value={posicion} onChange={(e) => setPosicion(e.target.value)}>
                {opciones.map((x) => <option key={x} value={x}>{nombrePosicion(x)}</option>)}
              </select>
            </label>
          )}
          <button className="btn" disabled={cargando || bajaConducta || p.faltantes <= 0 || !posicion}
            onClick={() => llamar('solicitar_unirse', { p_publicacion: p.id, p_posicion: posicion })}>
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
                {s.posicion && <> · quiere jugar de <b>{nombrePosicion(s.posicion).toLowerCase()}</b></>}
                {s.jugador && <> · conducta <b className="score">{uno(s.jugador.conducta)}</b>
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
      {p.tipo === 'reto' && (
        <Link className={p.rival ? 'btn ghost' : 'btn'} href={`/reto/${p.id}`}>{p.rival ? 'Ver alineaciones' : 'Ver alineación y aceptar'}</Link>
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
