-- =====================================================================
-- Fútbol Naval · Esquema de base de datos para Supabase (PostgreSQL)
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Limpieza (permite volver a ejecutar el script sin errores) ----------
drop view if exists jugadores_publico;
drop table if exists calificaciones, denuncias, partido_jugadores, partidos, publicacion_posiciones, publicaciones, equipo_jugadores, equipos, perfiles cascade;
drop type if exists posicion, tipo_publicacion, tipo_falta, estado_denuncia cascade;
drop policy if exists "subir mi foto" on storage.objects;

-- ---------- Tipos ----------
create type posicion as enum ('arquero','defensa','mediocampista','delantero');
create type tipo_publicacion as enum ('faltan_jugadores','reto');
create type tipo_falta as enum ('no_asistio','tarde','abandono','verbal','fisica','pago');
create type estado_denuncia as enum ('pendiente','confirmada','rechazada');

-- ---------- Perfiles (1 por cuenta; el correo único lo garantiza Supabase Auth) ----------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null check (char_length(nombre_completo) between 5 and 80),
  telefono text not null unique check (telefono similar to '9[0-9]{8}'),
  foto_url text,
  posicion posicion not null,
  distrito text not null,
  victorias int not null default 0,
  partidos_limpios int not null default 0,
  creado_en timestamptz not null default now()
);

-- ---------- Equipos ----------
create table equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  capitan_id uuid not null references perfiles(id),
  creado_en timestamptz not null default now()
);

create table equipo_jugadores (
  equipo_id uuid references equipos(id) on delete cascade,
  jugador_id uuid references perfiles(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (equipo_id, jugador_id)
);

-- ---------- Publicaciones: "faltan jugadores" o "reto" ----------
create table publicaciones (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_publicacion not null,
  equipo_id uuid not null references equipos(id) on delete cascade,
  distrito text not null,
  cancha text not null,
  direccion text not null,
  fecha_hora timestamptz not null,
  costo_por_jugador numeric(6,2) not null default 0,
  jugadores_faltantes int not null default 0 check (jugadores_faltantes between 0 and 6),
  conducta_minima numeric(3,1) not null default 0,
  rival_equipo_id uuid references equipos(id),      -- se llena al aceptar un reto
  creado_en timestamptz not null default now()
);
create index on publicaciones (distrito, fecha_hora);

-- Posiciones que busca cada publicación (una fila por posición)
create table publicacion_posiciones (
  publicacion_id uuid references publicaciones(id) on delete cascade,
  posicion posicion not null,
  primary key (publicacion_id, posicion)
);

-- ---------- Partidos jugados (para habilitar denuncias y calificaciones) ----------
create table partidos (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid references publicaciones(id),
  equipo_local uuid not null references equipos(id),
  equipo_visita uuid references equipos(id),
  ganador uuid references equipos(id),
  jugado_en timestamptz not null
);

create table partido_jugadores (
  partido_id uuid references partidos(id) on delete cascade,
  jugador_id uuid references perfiles(id) on delete cascade,
  equipo_id uuid references equipos(id),
  primary key (partido_id, jugador_id)
);

-- ---------- Denuncias (bajan la conducta) ----------
create table denuncias (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id),
  denunciado_id uuid not null references perfiles(id),
  denunciante_id uuid not null references perfiles(id),
  tipo tipo_falta not null,
  detalle text,
  estado estado_denuncia not null default 'pendiente',
  creado_en timestamptz not null default now(),
  unique (partido_id, denunciado_id, denunciante_id),   -- una denuncia por partido
  check (denunciado_id <> denunciante_id)
);

-- ---------- Calificaciones (forman la medalla) ----------
create table calificaciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id),
  calificado_id uuid not null references perfiles(id),
  calificador_id uuid not null references perfiles(id),
  puntaje int not null check (puntaje between 0 and 10),
  creado_en timestamptz not null default now(),
  unique (partido_id, calificado_id, calificador_id),
  check (calificado_id <> calificador_id)
);

-- ---------- Vista pública con conducta y medalla calculadas ----------
create or replace view jugadores_publico as
select p.id, p.nombre_completo, p.foto_url, p.posicion, p.distrito, p.victorias,
  least(10, greatest(0,
    10 - coalesce((select sum(case d.tipo  -- descuento por falta (SUPUESTO, ajustable)
                     when 'no_asistio' then 1.5 when 'tarde' then 0.5 when 'abandono' then 1.0
                     when 'verbal' then 2.0 when 'fisica' then 4.0 when 'pago' then 1.5 end) from denuncias d
                   where d.denunciado_id = p.id and d.estado = 'confirmada'),0)
       + p.partidos_limpios * 0.2)) as conducta,
  (select count(*) from calificaciones c where c.calificado_id = p.id) as num_calificaciones,
  case when (select count(*) from calificaciones c where c.calificado_id = p.id) >= 10
       then least(10, (select avg(puntaje) from calificaciones c where c.calificado_id = p.id) + 0.1 * p.victorias)
  end as medalla
from perfiles p;

-- ---------- Seguridad (Row Level Security) ----------
alter table perfiles enable row level security;
alter table equipos enable row level security;
alter table equipo_jugadores enable row level security;
alter table publicaciones enable row level security;
alter table publicacion_posiciones enable row level security;
alter table partidos enable row level security;
alter table partido_jugadores enable row level security;
alter table denuncias enable row level security;
alter table calificaciones enable row level security;

-- Perfiles: cada uno edita solo el suyo. El teléfono no se expone en la vista pública.
create policy "ver perfil propio" on perfiles for select using (auth.uid() = id);
create policy "crear perfil propio" on perfiles for insert with check (auth.uid() = id);
create policy "editar perfil propio" on perfiles for update using (auth.uid() = id);

-- Lectura pública para usuarios con sesión
create policy "leer equipos" on equipos for select to authenticated using (true);
create policy "leer integrantes" on equipo_jugadores for select to authenticated using (true);
create policy "leer publicaciones" on publicaciones for select to authenticated using (true);
create policy "leer posiciones buscadas" on publicacion_posiciones for select to authenticated using (true);
create policy "leer partidos" on partidos for select to authenticated using (true);
create policy "leer partido_jugadores" on partido_jugadores for select to authenticated using (true);
create policy "leer calificaciones" on calificaciones for select to authenticated using (true);
create policy "leer denuncias confirmadas" on denuncias for select to authenticated
  using (estado = 'confirmada' or denunciante_id = auth.uid());

-- Escritura
create policy "crear equipo como capitan" on equipos for insert with check (capitan_id = auth.uid());
create policy "unirse a un equipo" on equipo_jugadores for insert with check (jugador_id = auth.uid());
create policy "salir de un equipo" on equipo_jugadores for delete using (jugador_id = auth.uid());
create policy "capitan publica" on publicaciones for insert
  with check (exists (select 1 from equipos e where e.id = equipo_id and e.capitan_id = auth.uid()));
create policy "capitan indica posiciones" on publicacion_posiciones for insert
  with check (exists (select 1 from publicaciones p join equipos e on e.id = p.equipo_id
                      where p.id = publicacion_id and e.capitan_id = auth.uid()));

-- Solo denuncia / califica quien jugó ese mismo partido que el otro jugador
create policy "denunciar companero de partido" on denuncias for insert with check (
  denunciante_id = auth.uid()
  and exists (select 1 from partido_jugadores a where a.partido_id = denuncias.partido_id and a.jugador_id = auth.uid())
  and exists (select 1 from partido_jugadores b where b.partido_id = denuncias.partido_id and b.jugador_id = denuncias.denunciado_id));
create policy "calificar companero de partido" on calificaciones for insert with check (
  calificador_id = auth.uid()
  and exists (select 1 from partido_jugadores a where a.partido_id = calificaciones.partido_id and a.jugador_id = auth.uid())
  and exists (select 1 from partido_jugadores b where b.partido_id = calificaciones.partido_id and b.jugador_id = calificaciones.calificado_id));

-- ---------- Almacenamiento de fotos de perfil ----------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict do nothing;
create policy "subir mi foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and name like auth.uid()::text || '/%');
