-- =====================================================================
-- Fútbol Naval · Solo retos entre equipos, logo del equipo y ceder capitanía
-- Ejecutar DESPUÉS de 01 a 07. Se puede ejecutar varias veces.
-- =====================================================================

-- 1) Logo del equipo (imagen subida al almacenamiento "fotos")
alter table equipos_fijos add column if not exists logo_url text;

create or replace function public.logo_valido(p_url text)
returns boolean language sql immutable as $$
  select p_url is not null and p_url like 'https://%/storage/v1/object/public/fotos/%'
$$;

-- Crear equipo: nombre + logo obligatorios. Quien lo crea es el capitán.
drop function if exists public.crear_equipo_fijo(text);
create or replace function public.crear_equipo_fijo(p_nombre text, p_logo_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if char_length(trim(coalesce(p_nombre, ''))) < 3 then raise exception 'El nombre debe tener al menos 3 letras.'; end if;
  if not logo_valido(p_logo_url) then raise exception 'Sube el logo de tu equipo.'; end if;
  if exists (select 1 from equipos_fijos where lower(nombre) = lower(trim(p_nombre))) then
    raise exception 'Ya existe un equipo con ese nombre.';
  end if;
  insert into equipos_fijos (nombre, capitan_id, logo_url) values (trim(p_nombre), auth.uid(), p_logo_url) returning id into v_id;
  insert into equipo_fijo_miembros (equipo_id, jugador_id, estado) values (v_id, auth.uid(), 'miembro');
  return v_id;
end $$;

-- Cambiar el logo (solo el capitán)
create or replace function public.cambiar_logo_equipo(p_equipo uuid, p_logo_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not logo_valido(p_logo_url) then raise exception 'La imagen del logo no es válida.'; end if;
  update equipos_fijos set logo_url = p_logo_url where id = p_equipo and capitan_id = auth.uid();
  if not found then raise exception 'Solo el capitán puede cambiar el logo.'; end if;
end $$;

-- 2) Ceder la capitanía a otro integrante
create or replace function public.ceder_capitania(p_equipo uuid, p_jugador uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq equipos_fijos;
begin
  select * into v_eq from equipos_fijos where id = p_equipo for update;
  if v_eq.id is null or v_eq.capitan_id <> auth.uid() then raise exception 'Solo el capitán puede ceder la capitanía.'; end if;
  if p_jugador = auth.uid() then raise exception 'Ya eres el capitán.'; end if;
  if not exists (select 1 from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = p_jugador and estado = 'miembro') then
    raise exception 'El nuevo capitán debe ser integrante del equipo.';
  end if;
  update equipos_fijos set capitan_id = p_jugador where id = p_equipo;
  -- Los retos que aún no se juegan también pasan al nuevo capitán
  update equipos e set capitan_id = p_jugador
  from publicaciones p
  where p.fecha_hora >= now()
    and ((p.equipo_fijo_id = p_equipo and e.id = p.equipo_id) or (p.rival_fijo_id = p_equipo and e.id = p.rival_equipo_id));
  insert into equipo_jugadores (equipo_id, jugador_id)
  select p.equipo_id, p_jugador from publicaciones p where p.equipo_fijo_id = p_equipo and p.fecha_hora >= now()
  union select p.rival_equipo_id, p_jugador from publicaciones p where p.rival_fijo_id = p_equipo and p.fecha_hora >= now()
  on conflict do nothing;
  perform notificar(p_jugador, alias_de(auth.uid()) || ' te nombró capitán de ' || v_eq.nombre || '.', '/equipos/' || p_equipo);
end $$;

-- 3) Para lanzar o aceptar retos, el equipo debe tener logo (además de 7+ integrantes)
create or replace function public.validar_alineacion(p_equipo_fijo uuid, p_jugadores uuid[])
returns void language plpgsql security definer set search_path = public stable as $$
declare v_total int; v_validos int;
begin
  if not exists (select 1 from equipo_fijo_miembros where equipo_id = p_equipo_fijo and jugador_id = auth.uid() and estado = 'miembro') then
    raise exception 'Solo un integrante del equipo puede usarlo en un reto.';
  end if;
  if not exists (select 1 from equipos_fijos where id = p_equipo_fijo and logo_valido(logo_url)) then
    raise exception 'Tu equipo necesita un logo. El capitán puede subirlo en la página del equipo.';
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

-- 4) Por ahora solo hay retos: ya no se publican partidos de "faltan jugadores"
create or replace function public.crear_publicacion(
  p_tipo tipo_publicacion, p_equipo text, p_distrito text, p_cancha text, p_direccion text,
  p_fecha_hora timestamptz, p_costo numeric, p_faltantes int, p_conducta_minima numeric,
  p_posiciones posicion[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Por ahora solo se publican retos entre equipos registrados.';
end $$;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.notificar(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.aceptar_reto(uuid, text) from public, anon, authenticated;
revoke execute on function public.unirse(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
