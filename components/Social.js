import Link from 'next/link';
import Avatar from '@/components/Avatar';

// Amigos (cantidad y en común) y equipos de un jugador
export default function Social({ resumen, comunes = [], equipos = [], propio = false }) {
  return (
    <div className="card">
      <div className="meta" style={{ fontSize: 15 }}>
        <span><b>{resumen?.total_amigos ?? 0}</b> {resumen?.total_amigos === 1 ? 'amigo' : 'amigos'}</span>
        {!propio && <span><b>{resumen?.en_comun ?? 0}</b> en común</span>}
        {propio && <Link href="/amigos">Ver mis amigos</Link>}
      </div>
      {!propio && comunes.length > 0 && (
        <div className="roster">
          {comunes.map((c) => (
            <Link key={c.id} className="pbtn" href={`/jugador/${c.id}`}><Avatar jugador={c} />{c.alias}</Link>
          ))}
        </div>
      )}
      <div>
        <b style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Equipos</b>
        <div className="chips" style={{ marginTop: 6 }}>
          {equipos.length === 0 && <span style={{ color: 'var(--muted)' }}>No pertenece a ningún equipo.</span>}
          {equipos.map((e) => <Link key={e.id} className="chip" href={`/equipos/${e.id}`}>{e.nombre}</Link>)}
        </div>
      </div>
    </div>
  );
}
