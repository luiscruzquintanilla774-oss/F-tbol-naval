-- =====================================================================
-- Fútbol Naval · Solicitudes para unirse a un equipo (el capitán acepta o rechaza)
-- Ejecutar DESPUÉS de 01, 02 y 03. Se puede ejecutar varias veces.
-- =====================================================================

do $$ begin
  create type estado_solicitud as enum ('pendiente','aceptada','rechazada');
exception when duplicate_object then null; end $$;

create table if not exists solicitudes (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references publicaciones(id) on delete cascade,
  jugador_id uuid not null references perfiles(id) on delete cascade,
  estado estado_solicitud not null default 'pendiente',
  creado_en timestamptz not null default now(),
  respondido_en timestamptz,
  unique (publicacion_id, jugador_id)
);

alter table solicitudes enable row level security;

-- La ve el jugador que la envió y el capitán del equipo
drop policy if exists "ver mis solicitudes o las de mi equipo" on solicitudes;
create policy "ver mis solicitudes o las de mi equipo" on solicitudes for select to authenticated using (
  jugador_id = auth.uid()
  or exists (select 1 from publicaciones p join equipos e on e.id = p.equipo_id
             where p.id = solicitudes.publicacion_id and e.capitan_id = auth.uid()));
grant select on solicitudes to authenticated;

-- 1) Enviar solicitud
create or replace function public.solicitar_unirse(p_publicacion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pub publicaciones; v_conducta numeric; v_estado estado_solicitud;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if not exists (select 1 from perfiles where id = auth.uid() and alias is not null) then
    raise exception 'Primero elige tu alias en Mi perfil.';
  end if;
  select * into v_pub from publicaciones where id = p_publicacion;
  if v_pub.id is null then raise exception 'La publicación no existe.'; end if;
  if v_pub.tipo <> 'faltan_jugadores' then raise exception 'Esta publicación es un reto, no busca jugadores.'; end if;
  if v_pub.jugadores_faltantes <= 0 then raise exception 'El equipo ya está completo.'; end if;
  if exists (select 1 from equipo_jugadores where equipo_id = v_pub.equipo_id and jugador_id = auth.uid()) then
    raise exception 'Ya estás en este equipo.';
  end if;
  select conducta into v_conducta from jugadores_publico where id = auth.uid();
  if v_conducta < v_pub.conducta_minima then
    raise exception 'Tu conducta (%) es menor que la mínima que pide el equipo (%).', round(v_conducta,1), v_pub.conducta_minima;
  end if;
  select estado into v_estado from solicitudes where publicacion_id = p_publicacion and jugador_id = auth.uid();
  if v_estado = 'rechazada' then raise exception 'El capitán ya rechazó tu solicitud para este partido.'; end if;
  if v_estado = 'pendiente' then raise exception 'Ya enviaste tu solicitud. Espera la respuesta del capitán.'; end if;
  insert into solicitudes (publicacion_id, jugador_id) values (p_publicacion, auth.uid())
  on conflict (publicacion_id, jugador_id) do update set estado = 'pendiente', creado_en = now(), respondido_en = null;
end $$;

-- 2) Cancelar mi solicitud pendiente
create or replace function public.cancelar_solicitud(p_publicacion uuid)
returns void language sql security definer set search_path = public as $$
  delete from solicitudes where publicacion_id = p_publicacion and jugador_id = auth.uid() and estado = 'pendiente'
$$;

-- 3) El capitán acepta o rechaza
create or replace function public.responder_solicitud(p_solicitud uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_sol solicitudes; v_pub publicaciones;
begin
  select * into v_sol from solicitudes where id = p_solicitud for update;
  if v_sol.id is null then raise exception 'La solicitud no existe.'; end if;
  select * into v_pub from publicaciones where id = v_sol.publicacion_id for update;
  if not exists (select 1 from equipos where id = v_pub.equipo_id and capitan_id = auth.uid()) then
    raise exception 'Solo el capitán del equipo puede responder solicitudes.';
  end if;
  if v_sol.estado <> 'pendiente' then raise exception 'Esta solicitud ya fue respondida.'; end if;

  if p_aceptar then
    if v_pub.jugadores_faltantes <= 0 then raise exception 'Tu equipo ya está completo.'; end if;
    insert into equipo_jugadores (equipo_id, jugador_id) values (v_pub.equipo_id, v_sol.jugador_id) on conflict do nothing;
    update publicaciones set jugadores_faltantes = jugadores_faltantes - 1 where id = v_pub.id;
    update solicitudes set estado = 'aceptada', respondido_en = now() where id = p_solicitud;
  else
    update solicitudes set estado = 'rechazada', respondido_en = now() where id = p_solicitud;
  end if;
end $$;

grant execute on function public.solicitar_unirse(uuid) to authenticated;
grant execute on function public.cancelar_solicitud(uuid) to authenticated;
grant execute on function public.responder_solicitud(uuid, boolean) to authenticated;

-- 4) Ya no se puede entrar directo: solo por solicitud aceptada
revoke execute on function public.unirse(uuid) from public, anon, authenticated;

-- 5) Si un jugador sale del equipo, su solicitud se borra (podrá volver a pedir)
create or replace function public.salir(p_publicacion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pub publicaciones;
begin
  select * into v_pub from publicaciones where id = p_publicacion for update;
  if exists (select 1 from equipos where id = v_pub.equipo_id and capitan_id = auth.uid()) then
    raise exception 'Eres el capitán: no puedes salir de tu propio equipo.';
  end if;
  delete from equipo_jugadores where equipo_id = v_pub.equipo_id and jugador_id = auth.uid();
  if found and v_pub.tipo = 'faltan_jugadores' then
    update publicaciones set jugadores_faltantes = jugadores_faltantes + 1 where id = p_publicacion;
  end if;
  delete from solicitudes where publicacion_id = p_publicacion and jugador_id = auth.uid();
end $$;

notify pgrst, 'reload schema';
