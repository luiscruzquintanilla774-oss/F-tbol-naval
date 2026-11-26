export default function Avatar({ jugador, grande = false }) {
  const iniciales = (jugador?.alias ?? '?').slice(0, 2).toUpperCase();
  return (
    <span className={`avatar${grande ? ' big' : ''}`}>
      {jugador?.foto_url ? <img src={jugador.foto_url} alt="" /> : iniciales}
    </span>
  );
}
