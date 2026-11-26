import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { nombrePosicion, uno } from '@/lib/datos';

// Una fila con foto, alias y datos básicos de un jugador; a la derecha, acciones
export default function FilaJugador({ j, detalle = null, children = null }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingBlock: 8, borderBottom: '1px solid var(--line)' }}>
      <Link href={`/jugador/${j.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ink)', textDecoration: 'none', minWidth: 0, flex: '1 1 220px' }}>
        <Avatar jugador={j} />
        <span style={{ display: 'grid', minWidth: 0 }}>
          <b>{j.alias ?? 'Sin alias'}</b>
          <small style={{ color: 'var(--muted)' }}>
            {j.posicion && nombrePosicion(j.posicion)}{j.distrito && ` · ${j.distrito}`}
            {j.conducta != null && <> · conducta <span className="score">{uno(j.conducta)}</span></>}
            {detalle && <> · {detalle}</>}
          </small>
        </span>
      </Link>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}
