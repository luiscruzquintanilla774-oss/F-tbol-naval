# Fútbol Naval

Web para encontrar partidos de fútbol 7 en Lima Metropolitana: los jugadores se unen a equipos incompletos
y los equipos completos lanzan retos. Cada jugador tiene conducta (0 a 10) y medalla (0 a 10).

Hecha con **Next.js** + **Supabase** y publicada en **Vercel**.

## Puesta en marcha

1. **Supabase > SQL Editor > New query**: pega y ejecuta, en orden, `supabase/01-esquema.sql`, `supabase/02-funciones.sql` y `supabase/03-alias-privacidad.sql`.
2. **Supabase > Authentication > Sign In / Providers**: Email activado y *Confirm email* activado.
3. **Vercel > Add New > Project**: importa este repositorio y agrega estas variables (Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave *anon public* (o *publishable*) de Supabase
4. **Supabase > Authentication > URL Configuration**: en *Site URL* pon la dirección que te dio Vercel
   (por ejemplo `https://futbol-naval.vercel.app`) y en *Redirect URLs* agrega `https://futbol-naval.vercel.app/**`.

## Qué incluye esta versión

- Registro con nombre, correo, teléfono, posición y distrito (correo y teléfono únicos, correo verificado).
- Foto de perfil desde "Mi perfil".
- Lista de partidos con filtro por distrito y tipo.
- Publicar "me faltan jugadores" o "reto", unirse / salir de un equipo, aceptar retos.
- Teléfonos visibles solo entre integrantes del mismo equipo.
- Perfil con conducta, medalla y faltas.

## Pendiente (siguiente versión)

- Cerrar un partido (resultado y asistentes), denunciar faltas y calificar a compañeros.
- Panel de administrador para confirmar denuncias.

## Desarrollo local (opcional)

```bash
cp .env.example .env.local   # y completa los valores
npm install
npm run dev
```
