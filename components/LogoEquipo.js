// Escudo del equipo: su logo, o sus iniciales si aún no tiene
export default function LogoEquipo({ equipo, tam = 48 }) {
  const estilo = { width: tam, height: tam, borderRadius: '50%', flex: 'none', objectFit: 'cover', border: '2px solid var(--line)', background: 'var(--surface)' };
  if (equipo?.logo_url) return <img src={equipo.logo_url} alt={`Logo de ${equipo.nombre}`} style={estilo} />;
  const iniciales = (equipo?.nombre ?? '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span aria-hidden="true" style={{ ...estilo, display: 'inline-grid', placeItems: 'center', background: 'var(--navy)', color: '#fff', fontWeight: 800, fontSize: tam * 0.36 }}>
      {iniciales}
    </span>
  );
}
