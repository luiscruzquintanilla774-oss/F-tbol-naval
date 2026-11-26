import Avatar from '@/components/Avatar';
import { FALTAS, colorNota, nombrePosicion, uno } from '@/lib/datos';

// Ficha del jugador: datos, conducta, medalla y faltas
export default function Ficha({ jugador: j, faltas = [], extra = null, children = null }) {
  const conducta = Number(j.conducta);
  return (
    <>
      <div className="card profile">
        <Avatar jugador={j} grande />
        <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
          <h1 style={{ fontSize: 34 }}>{j.alias ?? 'Sin alias'}</h1>
          <div className="meta"><span><b>{nombrePosicion(j.posicion)}</b></span><span>{j.distrito}</span>{extra}</div>
          {children}
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="lbl">Conducta</div>
          <div className="val" style={{ color: colorNota(conducta) }}>{uno(conducta)}<small style={{ fontSize: 16, color: 'var(--muted)' }}> / 10</small></div>
          <div className="bar"><i style={{ width: `${conducta * 10}%`, background: colorNota(conducta) }} /></div>
        </div>
        <div className="stat">
          <div className="lbl">Medalla</div>
          {j.medalla == null ? (
            <>
              <div className="val" style={{ fontSize: 22, paddingBlock: 7 }}>En evaluación</div>
              <div className="bar"><i style={{ width: `${Math.min(10, j.num_calificaciones) * 10}%`, background: 'var(--muted)' }} /></div>
              <small style={{ color: 'var(--muted)' }}>{j.num_calificaciones} de 10 calificaciones</small>
            </>
          ) : (
            <>
              <div className="val">★ {uno(j.medalla)}</div>
              <small style={{ color: 'var(--muted)' }}>{j.num_calificaciones} calificaciones + {j.victorias} victorias × 0.1</small>
            </>
          )}
        </div>
        <div className="stat"><div className="lbl">Victorias</div><div className="val">{j.victorias}</div></div>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 22 }}>Faltas confirmadas</h2>
        {faltas.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>Sin faltas registradas.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Fecha</th><th>Falta</th><th>Descuento</th></tr></thead>
              <tbody>
                {faltas.map((f, i) => (
                  <tr key={i}>
                    <td>{new Date(f.creado_en).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</td>
                    <td>{FALTAS[f.tipo]?.nombre ?? f.tipo}</td>
                    <td className="score" style={{ color: 'var(--danger)' }}>−{uno(FALTAS[f.tipo]?.puntos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
