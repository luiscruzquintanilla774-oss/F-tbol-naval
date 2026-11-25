export default function Avatar({ jugador, grande = false }) {
  const iniciales = (jugador?.nombre_completo ?? '?')
    .split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className={`avatar${grande ? ' big' : ''}`}>
      {jugador?.foto_url ? <img src={jugador.foto_url} alt="" /> : iniciales}
    </span>
  );
}
