import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { uno } from '@/lib/datos';

// Fila de estrellas sobre 10 según la medalla
function Estrellas({ medalla }) {
  if (medalla == null) return <span className="estrellas sin">Sin calificación</span>;
  const llenas = Math.round(Number(medalla));
  return (
    <span className="estrellas" title={`Medalla ${uno(medalla)} de 10`}>
      <span className="llena">{'★'.repeat(llenas)}</span><span className="vacia">{'★'.repeat(10 - llenas)}</span>
    </span>
  );
}

const LINEAS = [
  { pos: 'delantero', nombre: 'Delanteros' },
  { pos: 'mediocampista', nombre: 'Mediocampistas' },
  { pos: 'defensa', nombre: 'Defensas' },
  { pos: 'arquero', nombre: 'Arquero' },
];

// Mini cancha vertical con los titulares ubicados por su posición
export default function Cancha({ nombre, jugadores = [], equipoId = null }) {
  const conMedalla = jugadores.filter((j) => j.medalla != null);
  const promedio = conMedalla.length ? conMedalla.reduce((a, j) => a + Number(j.medalla), 0) / conMedalla.length : null;
  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 24 }}>{equipoId ? <Link href={`/equipos/${equipoId}`} style={{ color: 'inherit' }}>{nombre}</Link> : nombre}</h2>
        <small style={{ color: 'var(--muted)' }}>
          Nivel promedio: {promedio == null ? 'sin calificación' : <b className="score">{uno(promedio)} / 10</b>}
          {' '}({conMedalla.length} de {jugadores.length} con medalla)
        </small>
      </div>
      <div className="cancha" role="img" aria-label={`Alineación de ${nombre}`}>
        <div className="cancha-lineas" aria-hidden="true"><i className="medio" /><i className="circulo" /><i className="area arriba" /><i className="area abajo" /></div>
        {LINEAS.map((l) => {
          const enLinea = jugadores.filter((j) => j.posicion === l.pos);
          if (enLinea.length === 0) return <div key={l.pos} className="linea" />;
          return (
            <div key={l.pos} className="linea">
              {enLinea.map((j) => (
                <Link key={j.id} href={`/jugador/${j.id}`} className="ficha-cancha">
                  <Avatar jugador={j} />
                  <b>{j.alias}</b>
                  <Estrellas medalla={j.medalla} />
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
