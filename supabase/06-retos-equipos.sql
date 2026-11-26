-- =====================================================================
-- Fútbol Naval · Retos solo entre equipos registrados, con alineación de 7
-- Ejecutar DESPUÉS de 01 a 05. Se puede ejecutar varias veces.
-- =====================================================================

alter table publicaciones add column if not exists equipo_fijo_id uuid references equipos_fijos(id) on delete set null;
alter table publicaciones add column if not exists rival_fijo_id uuid references equipos_fijos(id) on delete set null;

-- Los 7 titulares de cada equipo en un reto
create table if not exists reto_alineacion (
  publicacion_id uuid not null references publicaciones(id) on delete cascade,
  equipo_fijo_id uuid not null references equipos_fijos(id) on delete cascade,
  jugador_id uuid not null references perfiles(id) on delete cascade,
  primary key (publicacion_id, jugador_id)
);
alter table reto_alineacion enable row level security;
drop policy if exists "leer alineaciones" on reto_alineacion;
create policy "leer alineaciones" on reto_alineacion for select to authenticated using (true);
grant select on reto_alineacion to authenticated;

-- Revisa que el equipo tenga 7+ integrantes, que yo sea parte y que los 7 elegidos sean del equipo
create or replace function public.validar_alineacion(p_equipo_fijo uuid, p_jugadores uuid[])
returns void language plpgsql security definer set search_path = public stable as $$
declare v_total int; v_validos int;
begin
  if not exists (select 1 from equipo_fijo_miembros where equipo_id = p_equipo_fijo and jugador_id = auth.uid() and estado = 'miembro') then
    raise exception 'Solo un integrante del equipo puede usarlo en un reto.';
  end if;
  select count(*) into v_total from equipo_fijo_miembros where equipo_id = p_equipo_fijo and estado = 'miembro';
  if v_total < 7 then
    raise exception 'Tu equipo tiene % integrantes. Necesita al menos 7 para lanzar o aceptar retos.', v_total;
  end if;
  if coalesce(array_length(p_jugadores, 1), 0) <> 7 or (select count(distinct x) from unnest(p_jugadores) x) <> 7 then
    raise exception 'Elige exactamente 7 jugadores titulares.';
  end if;
  select count(*) into v_validos from equipo_fijo_miembros
  where equipo_id = p_equipo_fijo and estado = 'miembro' and jugador_id = any(p_jugadores);
  if v_validos <> 7 then raise exception 'Todos los titulares deben ser integrantes del equipo.'; end if;
end $$;

-- Lanzar un reto con un equipo registrado
create or replace function public.crear_reto(
  p_equipo_fijo uuid, p_distrito text, p_cancha text, p_direccion text,
  p_fecha_hora timestamptz, p_costo numeric, p_jugadores uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_nombre text; v_equipo uuid; v_pub uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_fecha_hora < now() then raise exception 'La fecha del partido ya pasó.'; end if;
  perform validar_alineacion(p_equipo_fijo, p_jugadores);
  select nombre into v_nombre from equipos_fijos where id = p_equipo_fijo;

  insert into equipos (nombre, capitan_id) values (v_nombre, auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) select v_equipo, x from unnest(p_jugadores) x;
  if not (auth.uid() = any(p_jugadores)) then
    insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  end if;
  insert into publicaciones (tipo, equipo_id, equipo_fijo_id, distrito, cancha, direccion, fecha_hora,
                             costo_por_jugador, jugadores_faltantes, conducta_minima)
  values ('reto', v_equipo, p_equipo_fijo, p_distrito, p_cancha, p_direccion, p_fecha_hora, coalesce(p_costo,0), 0, 0)
  returning id into v_pub;
  insert into reto_alineacion (publicacion_id, equipo_fijo_id, jugador_id)
  select v_pub, p_equipo_fijo, x from unnest(p_jugadores) x;
  return v_pub;
end $$;

-- Aceptar un reto con mi equipo registrado
create or replace function public.aceptar_reto_equipo(p_publicacion uuid, p_equipo_fijo uuid, p_jugadores uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_pub publicaciones; v_nombre text; v_equipo uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_pub from publicaciones where id = p_publicacion for update;
  if v_pub.id is null or v_pub.tipo <> 'reto' then raise exception 'Este reto no existe.'; end if;
  if v_pub.equipo_fijo_id is null then raise exception 'Este reto es antiguo y no tiene un equipo registrado.'; end if;
  if v_pub.rival_equipo_id is not null then raise exception 'Otro equipo ya aceptó este reto.'; end if;
  if v_pub.fecha_hora < now() then raise exception 'Este reto ya pasó.'; end if;
  if p_equipo_fijo = v_pub.equipo_fijo_id then raise exception 'No puedes aceptar el reto de tu propio equipo.'; end if;
  perform validar_alineacion(p_equipo_fijo, p_jugadores);
  if exists (select 1 from reto_alineacion where publicacion_id = p_publicacion and jugador_id = any(p_jugadores)) then
    raise exception 'Un jugador no puede estar en los dos equipos del mismo reto.';
  end if;
  select nombre into v_nombre from equipos_fijos where id = p_equipo_fijo;

  insert into equipos (nombre, capitan_id) values (v_nombre, auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) select v_equipo, x from unnest(p_jugadores) x;
  if not (auth.uid() = any(p_jugadores)) then
    insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  end if;
  insert into reto_alineacion (publicacion_id, equipo_fijo_id, jugador_id)
  select p_publicacion, p_equipo_fijo, x from unnest(p_jugadores) x;
  update publicaciones set rival_equipo_id = v_equipo, rival_fijo_id = p_equipo_fijo where id = p_publicacion;
end $$;

-- Los retos ya no se pueden crear ni aceptar "a mano" con un nombre inventado
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
  insert into equipos (nombre, capitan_id) values (p_equipo, auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  insert into publicaciones (tipo, equipo_id, distrito, cancha, direccion, fecha_hora, costo_por_jugador,
                             jugadores_faltantes, conducta_minima)
  values (p_tipo, v_equipo, p_distrito, p_cancha, p_direccion, p_fecha_hora, coalesce(p_costo,0),
          p_faltantes, coalesce(p_conducta_minima,0))
  returning id into v_pub;
  insert into publicacion_posiciones (publicacion_id, posicion)
  select distinct v_pub, x from unnest(p_posiciones) as x;
  return v_pub;
end $$;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.aceptar_reto(uuid, text) from public, anon, authenticated;
revoke execute on function public.unirse(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
