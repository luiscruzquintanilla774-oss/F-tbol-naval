import { FALTAS, uno } from '@/lib/datos';

export default function Reglas() {
  return (
    <>
      <div className="card rules">
        <h2 style={{ fontSize: 24, textTransform: 'uppercase' }}>Cómo se calcula la conducta</h2>
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
        <h2 style={{ fontSize: 24, textTransform: 'uppercase' }}>Cómo se calcula la medalla</h2>
        <p>Después de cada partido, los compañeros califican al jugador del 0 al 10. Al llegar a <b>10 calificaciones</b> aparece la medalla: el promedio de sus calificaciones más <b>0.1 por cada partido ganado</b>, con tope de 10.</p>
      </div>
      <div className="card rules">
        <h2 style={{ fontSize: 24, textTransform: 'uppercase' }}>Un correo, una persona</h2>
        <p>No se pueden crear dos cuentas con el mismo correo ni con el mismo teléfono, y el correo se verifica con un enlace antes de poder ingresar.</p>
      </div>
    </>
  );
}
