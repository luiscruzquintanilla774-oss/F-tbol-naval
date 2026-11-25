import './globals.css';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/server';
import BotonSalir from '@/components/BotonSalir';

export const metadata = {
  title: 'Fútbol Naval',
  description: 'Encuentra partidos de fútbol 7 en Lima Metropolitana: únete a equipos o lanza retos.',
};

export default async function Layout({ children }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

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
              <Link href="/">Partidos</Link>
              {user ? (
                <>
                  <Link href="/publicar">Publicar</Link>
                  <Link href="/perfil">Mi perfil</Link>
                  <Link href="/reglas">Reglas</Link>
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
