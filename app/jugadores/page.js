import { redirect } from 'next/navigation';

// La búsqueda de jugadores ahora vive en /amigos
export default async function Jugadores({ searchParams }) {
  const q = ((await searchParams)?.q ?? '').trim();
  redirect(q ? `/amigos?q=${encodeURIComponent(q)}` : '/amigos');
}
