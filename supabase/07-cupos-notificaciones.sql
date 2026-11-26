-- =====================================================================
-- Fútbol Naval · Una posición por cada jugador que falta + notificaciones
-- Ejecutar DESPUÉS de 01 a 06. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CUPOS: cada jugador que falta es un cupo con UNA posición
-- ---------------------------------------------------------------------
create table if not exists publicacion_cupos (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references publicaciones(id) on delete cascade,
  posicion posicion,                     -- vacío = cualquier posición (partidos antiguos)
  jugador_id uuid references perfiles(id) on delete set null,
  unique (publicacion_id, jugador_id)
);
alter table publicacion_cupos enable row level security;
drop policy if exists "leer cupos" on publicacion_cupos;
create policy "leer cupos" on publicacion_cupos for select to authenticated using (true);
grant select on publicacion_cupos to authenticated;

-- La solicitud indica a qué posición postula el jugador
alter table solicitudes add column if not exists posicion posicion;

-- Partidos que ya existían: sus cupos quedan como "cualquier posición"
insert into publicacion_cupos (publicacion_id, posicion)
select p.id, null from publicaciones p, generate_series(1, greatest(p.jugadores_faltantes, 0))
where p.tipo = 'faltan_jugadores'
  and not exists (select 1 from publicacion_cupos c where c.publicacion_id = p.id);

-- Publicar: una posición por cada jugador que falta
create or replace function public.crear_publicacion(
  p_tipo tipo_publicacion, p_equipo text, p_distrito text, p_cancha text, p_direccion text,
  p_fecha_hora timestamptz, p_costo numeric, p_faltantes int, p_conducta_minima numeric,
  p_posiciones posicion[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_equipo uuid; v_pub uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_tipo = 'reto' then raise exception 'Los retos se lanzan con un equipo registrado de al menos 7 jugadores.'; end if;
  if not exists (select 1 from perfiles where id = auth.uid()) then raise exception 'Completa tu perfil primero.'; end if;
  if p_fecha_hora < now() then raise exception 'La fecha del partido ya pasó.'; end if;
  if p_faltantes is null or p_faltantes < 1 or p_faltantes > 6 then raise exception 'Pueden faltar de 1 a 6 jugadores.'; end if;
  if coalesce(array_length(p_posiciones, 1), 0) <> p_faltantes or array_position(p_posiciones, null) is not null then
    raise exception 'Elige una posición para cada jugador que falta.';
  end if;
  insert into equipos (nombre, capitan_id) values (p_equipo, auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  insert into publicaciones (tipo, equipo_id, distrito, cancha, direccion, fecha_hora, costo_por_jugador,
                             jugadores_faltantes, conducta_minima)
  values (p_tipo, v_equipo, p_distrito, p_cancha, p_direccion, p_fecha_hora, coalesce(p_costo,0),
          p_faltantes, coalesce(p_conducta_minima,0))
  returning id into v_pub;
  insert into publicacion_cupos (publicacion_id, posicion) select v_pub, x from unnest(p_posiciones) x;
  insert into publicacion_posiciones (publicacion_id, posicion)
  select distinct v_pub, x from unnest(p_posiciones) as x;
  return v_pub;
end $$;

-- Solicitar unirse a UNA posición libre
drop function if exists public.solicitar_unirse(uuid);
create or replace function public.solicitar_unirse(p_publicacion uuid, p_posicion posicion)
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
  if not exists (select 1 from publicacion_cupos where publicacion_id = p_publicacion and jugador_id is null
                 and (posicion = p_posicion or posicion is null)) then
    raise exception 'Ese puesto ya no está libre. Elige otra posición.';
  end if;
  select conducta into v_conducta from jugadores_publico where id = auth.uid();
  if v_conducta < v_pub.conducta_minima then
    raise exception 'Tu conducta (%) es menor que la mínima que pide el equipo (%).', round(v_conducta,1), v_pub.conducta_minima;
  end if;
  select estado into v_estado from solicitudes where publicacion_id = p_publicacion and jugador_id = auth.uid();
  if v_estado = 'rechazada' then raise exception 'El capitán ya rechazó tu solicitud para este partido.'; end if;
  if v_estado = 'pendiente' then raise exception 'Ya enviaste tu solicitud. Espera la respuesta del capitán.'; end if;
  insert into solicitudes (publicacion_id, jugador_id, posicion) values (p_publicacion, auth.uid(), p_posicion)
  on conflict (publicacion_id, jugador_id) do update
    set estado = 'pendiente', posicion = p_posicion, creado_en = now(), respondido_en = null;
end $$;

-- El capitán acepta: el jugador ocupa el cupo de esa posición
create or replace function public.responder_solicitud(p_solicitud uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_sol solicitudes; v_pub publicaciones; v_cupo uuid;
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
    select id into v_cupo from publicacion_cupos
    where publicacion_id = v_pub.id and jugador_id is null
      and (v_sol.posicion is null or posicion is null or posicion = v_sol.posicion)
    order by (posicion = v_sol.posicion) desc nulls last
    limit 1 for update;
    if v_cupo is null then raise exception 'Ya no tienes un puesto libre para esa posición.'; end if;
    update publicacion_cupos set jugador_id = v_sol.jugador_id where id = v_cupo;
    insert into equipo_jugadores (equipo_id, jugador_id) values (v_pub.equipo_id, v_sol.jugador_id) on conflict do nothing;
    update publicaciones set jugadores_faltantes = jugadores_faltantes - 1 where id = v_pub.id;
    update solicitudes set estado = 'aceptada', respondido_en = now() where id = p_solicitud;
  else
    update solicitudes set estado = 'rechazada', respondido_en = now() where id = p_solicitud;
  end if;
end $$;

-- Salir del equipo libera el cupo
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
    update publicacion_cupos set jugador_id = null where publicacion_id = p_publicacion and jugador_id = auth.uid();
  end if;
  delete from solicitudes where publicacion_id = p_publicacion and jugador_id = auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- 2) NOTIFICACIONES
-- ---------------------------------------------------------------------
create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles(id) on delete cascade,
  mensaje text not null,
  enlace text,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists notificaciones_usuario on notificaciones (usuario_id, creado_en desc);
alter table notificaciones enable row level security;
drop policy if exists "ver mis notificaciones" on notificaciones;
create policy "ver mis notificaciones" on notificaciones for select to authenticated using (usuario_id = auth.uid());
grant select on notificaciones to authenticated;

create or replace function public.notificar(p_usuario uuid, p_mensaje text, p_enlace text)
returns void language sql security definer set search_path = public as $$
  insert into notificaciones (usuario_id, mensaje, enlace)
  select p_usuario, p_mensaje, p_enlace where p_usuario is not null
$$;

create or replace function public.alias_de(p_id uuid)
returns text language sql security definer set search_path = public stable as $$
  select coalesce((select alias from perfiles where id = p_id), 'Un jugador')
$$;

create or replace function public.contar_notificaciones()
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from notificaciones where usuario_id = auth.uid() and not leida
$$;

create or replace function public.marcar_notificaciones_leidas()
returns void language sql security definer set search_path = public as $$
  update notificaciones set leida = true where usuario_id = auth.uid() and not leida
$$;

-- Amistades
create or replace function public.tg_notif_amistad()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.estado = 'pendiente' then
    perform notificar(new.receptor_id, alias_de(new.solicitante_id) || ' te envió una solicitud de amistad.', '/amigos');
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'aceptada' then
    perform notificar(new.solicitante_id, alias_de(new.receptor_id) || ' aceptó tu solicitud de amistad.', '/jugador/' || new.receptor_id);
  end if;
  return new;
end $$;
drop trigger if exists notif_amistad on amistades;
create trigger notif_amistad after insert or update on amistades for each row execute function tg_notif_amistad();

-- Equipos propios (invitaciones y solicitudes)
create or replace function public.tg_notif_equipo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_eq equipos_fijos;
begin
  select * into v_eq from equipos_fijos where id = new.equipo_id;
  if tg_op = 'INSERT' and new.estado = 'invitado' then
    perform notificar(new.jugador_id, alias_de(v_eq.capitan_id) || ' te invitó a su equipo ' || v_eq.nombre || '.', '/equipos/' || v_eq.id);
  elsif tg_op = 'INSERT' and new.estado = 'solicitado' then
    perform notificar(v_eq.capitan_id, alias_de(new.jugador_id) || ' pidió unirse a tu equipo ' || v_eq.nombre || '.', '/equipos/' || v_eq.id);
  elsif tg_op = 'UPDATE' and new.estado = 'miembro' and old.estado = 'invitado' then
    perform notificar(v_eq.capitan_id, alias_de(new.jugador_id) || ' aceptó unirse a tu equipo ' || v_eq.nombre || '.', '/equipos/' || v_eq.id);
  elsif tg_op = 'UPDATE' and new.estado = 'miembro' and old.estado = 'solicitado' then
    perform notificar(new.jugador_id, 'Te aceptaron en el equipo ' || v_eq.nombre || '.', '/equipos/' || v_eq.id);
  end if;
  return new;
end $$;
drop trigger if exists notif_equipo on equipo_fijo_miembros;
create trigger notif_equipo after insert or update on equipo_fijo_miembros for each row execute function tg_notif_equipo();

-- Solicitudes para unirse a un partido
create or replace function public.tg_notif_solicitud()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_capitan uuid; v_equipo text; v_pos text;
begin
  select e.capitan_id, e.nombre into v_capitan, v_equipo
  from publicaciones p join equipos e on e.id = p.equipo_id where p.id = new.publicacion_id;
  v_pos := coalesce(' como ' || new.posicion::text, '');
  if new.estado = 'pendiente' and (tg_op = 'INSERT' or old.estado <> 'pendiente') then
    perform notificar(v_capitan, alias_de(new.jugador_id) || ' quiere jugar' || v_pos || ' en ' || v_equipo || '.', '/#p-' || new.publicacion_id);
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'aceptada' then
    perform notificar(new.jugador_id, 'El capitán de ' || v_equipo || ' aceptó tu solicitud. ¡Ya estás en el equipo!', '/#p-' || new.publicacion_id);
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'rechazada' then
    perform notificar(new.jugador_id, 'El capitán de ' || v_equipo || ' no aceptó tu solicitud.', '/#p-' || new.publicacion_id);
  end if;
  return new;
end $$;
drop trigger if exists notif_solicitud on solicitudes;
create trigger notif_solicitud after insert or update on solicitudes for each row execute function tg_notif_solicitud();

-- Partidos nuevos: avisa a los amigos del capitán y a quienes juegan en ese distrito.
-- Reto aceptado: avisa al capitán que lo lanzó.
create or replace function public.tg_notif_partido()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_capitan uuid; v_equipo text; v_fecha text; v_msg text; v_enlace text;
begin
  select capitan_id, nombre into v_capitan, v_equipo from equipos where id = new.equipo_id;
  v_fecha := to_char(new.fecha_hora at time zone 'America/Lima', 'DD/MM HH24:MI');
  v_enlace := case when new.tipo = 'reto' then '/reto/' || new.id else '/#p-' || new.id end;
  if tg_op = 'INSERT' then
    v_msg := case when new.tipo = 'reto'
      then 'Nuevo reto: ' || v_equipo || ' busca rival en ' || new.distrito || ' (' || v_fecha || ').'
      else 'Nuevo partido: a ' || v_equipo || ' le faltan jugadores en ' || new.distrito || ' (' || v_fecha || ').' end;
    insert into notificaciones (usuario_id, mensaje, enlace)
    select x.id, v_msg, v_enlace from (
      select id from perfiles where distrito = new.distrito
      union select ids_amigos(v_capitan)
    ) x where x.id <> v_capitan;
  elsif new.tipo = 'reto' and old.rival_equipo_id is null and new.rival_equipo_id is not null then
    perform notificar(v_capitan, (select nombre from equipos where id = new.rival_equipo_id)
      || ' aceptó tu reto del ' || v_fecha || '.', v_enlace);
  end if;
  return new;
end $$;
drop trigger if exists notif_partido on publicaciones;
create trigger notif_partido after insert or update on publicaciones for each row execute function tg_notif_partido();

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
grant execute on all functions in schema public to authenticated;
revoke execute on function public.notificar(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.aceptar_reto(uuid, text) from public, anon, authenticated;
revoke execute on function public.unirse(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
