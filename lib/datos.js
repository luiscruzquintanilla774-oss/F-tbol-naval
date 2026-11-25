export const DISTRITOS = [
  'Ancón', 'Ate', 'Barranco', 'Bellavista', 'Breña', 'Callao', 'Carabayllo', 'Cercado de Lima',
  'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María',
  'La Molina', 'La Perla', 'La Punta', 'La Victoria', 'Lince', 'Los Olivos', 'Lurigancho-Chosica',
  'Lurín', 'Magdalena del Mar', 'Mi Perú', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre',
  'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro',
  'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel',
  'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Ventanilla',
  'Villa El Salvador', 'Villa María del Triunfo',
];

export const POSICIONES = [
  { valor: 'arquero', nombre: 'Arquero' },
  { valor: 'defensa', nombre: 'Defensa' },
  { valor: 'mediocampista', nombre: 'Mediocampista' },
  { valor: 'delantero', nombre: 'Delantero' },
];
export const nombrePosicion = (v) => POSICIONES.find((p) => p.valor === v)?.nombre ?? v;

// SUPUESTO: puntos que descuenta cada falta confirmada (igual que en la base de datos)
export const FALTAS = {
  no_asistio: { nombre: 'No asistió a un partido inscrito', puntos: 1.5 },
  tarde: { nombre: 'Llegó tarde (más de 15 min)', puntos: 0.5 },
  abandono: { nombre: 'Abandonó el partido sin aviso', puntos: 1.0 },
  verbal: { nombre: 'Agresión verbal / insultos', puntos: 2.0 },
  fisica: { nombre: 'Agresión física', puntos: 4.0 },
  pago: { nombre: 'No pagó su parte de la cancha', puntos: 1.5 },
};

export const fechaLima = (iso) =>
  new Date(iso).toLocaleString('es-PE', {
    timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export const uno = (n) => Number(n ?? 0).toFixed(1);
export const colorNota = (v) => (v >= 8 ? 'var(--pitch)' : v >= 5 ? 'var(--flag-ink)' : 'var(--danger)');
