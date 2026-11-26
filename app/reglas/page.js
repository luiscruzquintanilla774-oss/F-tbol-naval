import { FALTAS, uno } from '@/lib/datos';

const h2 = { fontSize: 24, textTransform: 'uppercase' };

export default function Reglas() {
  return (
    <>
      <div className="card rules">
        <h2 style={h2}>Puntualidad</h2>
        <p>Todos los jugadores deben llegar a la cancha <b>10 minutos antes</b> de la hora pactada.</p>
        <p>Llegar <b>después de la hora pactada, aunque sea un minuto</b>, cuenta como tardanza y se puede denunciar.</p>
      </div>
      <div className="card rules">
        <h2 style={h2}>Cómo se calcula la conducta</h2>
        <p>Todo jugador empieza con <b>10.0</b>. Cada falta confirmada descuenta puntos. Por cada partido jugado sin denuncias recupera <b>+0.2</b>, sin pasar de 10.</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Falta</th><th>Descuento</th></tr></thead>
            <tbody>
              {Object.values(FALTAS).map((f) => (
                <tr key={f.nombre}><td>{f.nombre}</td><td className="score" style={{ color: 'var(--danger)' }}>−{uno(f.puntos)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Solo puede denunciar un jugador que estuvo en el mismo partido, una vez por partido. La falta cuenta cuando la confirma un segundo jugador del partido o un administrador.</p>
      </div>
      <div className="card rules">
        <h2 style={h2}>Cómo se calcula la medalla</h2>
        <p>Después de cada partido, los compañeros califican al jugador del 0 al 10. Al llegar a <b>10 calificaciones</b> aparece la medalla: el promedio de sus calificaciones más <b>0.1 por cada partido ganado</b>, con tope de 10.</p>
      </div>
      <div className="card rules">
        <h2 style={h2}>Alias y una cuenta por persona</h2>
        <p>Cada jugador se identifica con un <b>alias único que no se puede cambiar</b>, para que su historial de conducta y medalla lo acompañe siempre.</p>
        <p>No se pueden crear dos cuentas con el mismo correo ni con el mismo teléfono, y el correo se verifica con un enlace antes de poder ingresar.</p>
      </div>
      <div className="card rules">
        <h2 style={h2}>Tus datos personales</h2>
        <ul>
          <li><b>Lo ven todos los jugadores:</b> tu alias, foto, posición, distrito, conducta, medalla y faltas confirmadas.</li>
          <li><b>Lo ven solo los jugadores de tus equipos:</b> tu teléfono, para coordinar el partido.</li>
          <li><b>Lo ven solo los administradores:</b> tu nombre completo y tu correo.</li>
        </ul>
        <p>Puedes pedir a los administradores que corrijan o borren tus datos en cualquier momento.</p>
      </div>
    </>
  );
}
