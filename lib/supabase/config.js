// Datos públicos de conexión a Supabase (no son secretos: el navegador los necesita).
// Si existe la variable en Vercel se usa; si no, se usa la dirección del proyecto.
const URL_PROYECTO = 'https://bttfswcbrfikbsiiihks.supabase.co';

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || URL_PROYECTO)
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

export const SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();
