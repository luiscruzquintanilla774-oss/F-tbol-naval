import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

// Cliente de Supabase para usar en el navegador (componentes 'use client')
export function crearClienteNavegador() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}
