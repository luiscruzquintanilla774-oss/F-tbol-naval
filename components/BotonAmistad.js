import BotonRpc from '@/components/BotonRpc';

const chico = 'btn ghost';

// Botones según el estado de la amistad con un jugador
export default function BotonAmistad({ jugadorId, estado }) {
  const a = { p_jugador: jugadorId };
  if (estado === 'amigos') {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="chip need">✓ Amigos</span>
        <BotonRpc fn="eliminar_amistad" args={a} className={chico} confirmar="¿Eliminar de tus amigos?">Eliminar</BotonRpc>
      </span>
    );
  }
  if (estado === 'enviada') {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="chip">Solicitud enviada</span>
        <BotonRpc fn="eliminar_amistad" args={a} className={chico}>Cancelar</BotonRpc>
      </span>
    );
  }
  if (estado === 'recibida') {
    return (
      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
        <BotonRpc fn="responder_amistad" args={{ ...a, p_aceptar: true }}>Aceptar amistad</BotonRpc>
        <BotonRpc fn="responder_amistad" args={{ ...a, p_aceptar: false }} className={chico}>Rechazar</BotonRpc>
      </span>
    );
  }
  return <BotonRpc fn="enviar_solicitud_amistad" args={a}>+ Agregar amigo</BotonRpc>;
}
