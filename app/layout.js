import './globals.css';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/server';
import BotonSalir from '@/components/BotonSalir';

export const metadata = {
  title: 'Fútbol Naval',
  description: 'Retos de fútbol 7 entre equipos de Lima Metropolitana para medir su nivel.',
};

export default async function Layout({ children }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: esAdmin } = user ? await supabase.rpc('es_admin') : { data: false };
  const { data: pend } = user ? await supabase.rpc('mis_pendientes') : { data: null };
  const pendientes = pend?.[0] ?? { amigos: 0, equipos: 0 };
  const { data: sinLeer } = user ? await supabase.rpc('contar_notificaciones') : { data: 0 };
  const Aviso = ({ n }) => (n > 0 ? <span className="badge">{n}</span> : null);

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body>
        <header className="top">
          <div className="wrap">
            <Link className="brand" href="/">
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <circle cx="15" cy="15" r="13" fill="none" stroke="#f2b705" strokeWidth="2.5" />
                <path d="M15 5v18M9 11h12M8 19c2 3 4.5 4 7 4s5-1 7-4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              Fútbol Naval
            </Link>
            <nav className="tabs" aria-label="Secciones">
              <Link href="/">Retos</Link>
              {user ? (
                <>
                  <Link href="/publicar">Lanzar reto</Link>
                  <Link href="/amigos">Amigos<Aviso n={pendientes.amigos} /></Link>
                  <Link href="/equipos">Equipos<Aviso n={pendientes.equipos} /></Link>
                  <Link href="/notificaciones" aria-label="Notificaciones" title="Notificaciones">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-3px' }}>
                      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <Aviso n={sinLeer ?? 0} />
                  </Link>
                  <Link href="/perfil">Mi perfil</Link>
                  <Link href="/reglas">Reglas</Link>
                  {esAdmin && <Link href="/admin">Admin</Link>}
                  <BotonSalir />
                </>
              ) : (
                <>
                  <Link href="/reglas">Reglas</Link>
                  <Link href="/login">Ingresar</Link>
                  <Link href="/registro">Registrarme</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
