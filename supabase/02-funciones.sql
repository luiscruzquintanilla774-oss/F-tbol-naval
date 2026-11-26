-- =====================================================================
-- Fútbol Naval · Funciones (ejecutar DESPUÉS de 01-esquema.sql)
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- Se puede ejecutar varias veces sin problema.
-- =====================================================================

-- 1) Al registrarse un usuario, se crea su perfil con los datos del formulario
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data->>'nombre_completo' is null then
    return new;  -- usuario creado desde el panel, sin datos de perfil
  end if;
  insert into public.perfiles (id, nombre_completo, telefono, posicion, distrito)
  values (new.id,
          new.raw_user_meta_data->>'nombre_completo',
          new.raw_user_meta_data->>'telefono',
          (new.raw_user_meta_data->>'posicion')::posicion,
          new.raw_user_meta_data->>'distrito');
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- 2) ¿El teléfono ya está registrado? (se consulta antes de crear la cuenta)
create or replace function public.telefono_disponible(p_telefono text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from perfiles where telefono = p_telefono)
$$;
grant execute on function public.telefono_disponible(text) to anon, authenticated;

-- 3) Publicar un partido: crea el equipo, agrega al capitán y la publicación
create or replace function public.crear_publicacion(
  p_tipo tipo_publicacion, p_equipo text, p_distrito text, p_cancha text, p_direccion text,
  p_fecha_hora timestamptz, p_costo numeric, p_faltantes int, p_conducta_minima numeric,
  p_posiciones posicion[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_equipo uuid; v_pub uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if not exists (select 1 from perfiles where id = auth.uid()) then raise exception 'Completa tu perfil primero.'; end if;
  if p_fecha_hora < now() then raise exception 'La fecha del partido ya pasó.'; end if;

  insert into equipos (nombre, capitan_id) values (p_equipo, auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  insert into publicaciones (tipo, equipo_id, distrito, cancha, direccion, fecha_hora, costo_por_jugador,
                             jugadores_faltantes, conducta_minima)
  values (p_tipo, v_equipo, p_distrito, p_cancha, p_direccion, p_fecha_hora, coalesce(p_costo,0),
          case when p_tipo = 'reto' then 0 else p_faltantes end, coalesce(p_conducta_minima,0))
  returning id into v_pub;
  if p_tipo = 'faltan_jugadores' then
    insert into publicacion_posiciones (publicacion_id, posicion)
    select distinct v_pub, x from unnest(p_posiciones) as x;
  end if;
  return v_pub;
end $$;

-- 4) Unirse a un equipo al que le faltan jugadores
create or replace function public.unirse(p_publicacion uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pub publicaciones; v_conducta numeric;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_pub from publicaciones where id = p_publicacion for update;
  if v_pub.id is null then raise exception 'La publicación no existe.'; end if;
  if v_pub.tipo <> 'faltan_jugadores' then raise exception 'Esta publicación es un reto, no busca jugadores.'; end if;
  if v_pub.jugadores_faltantes <= 0 then raise exception 'El equipo ya está completo.'; end if;
  select conducta into v_conducta from jugadores_publico where id = auth.uid();
  if v_conducta < v_pub.conducta_minima then
    raise exception 'Tu conducta (%) es menor que la mínima que pide el equipo (%).', round(v_conducta,1), v_pub.conducta_minima;
  end if;
  insert into equipo_jugadores (equipo_id, jugador_id) values (v_pub.equipo_id, auth.uid()) on conflict do nothing;
  if not found then raise exception 'Ya estás en este equipo.'; end if;
  update publicaciones set jugadores_faltantes = jugadores_faltantes - 1 where id = p_publicacion;
end $$;

-- 5) Salir de un equipo (el capitán no puede salir)
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
end $$;

-- 6) Aceptar el reto de un equipo completo
create or replace function public.aceptar_reto(p_publicacion uuid, p_equipo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_pub publicaciones; v_equipo uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_pub from publicaciones where id = p_publicacion for update;
  if v_pub.tipo <> 'reto' then raise exception 'Esta publicación no es un reto.'; end if;
  if v_pub.rival_equipo_id is not null then raise exception 'Otro equipo ya aceptó este reto.'; end if;
  if exists (select 1 from equipo_jugadores where equipo_id = v_pub.equipo_id and jugador_id = auth.uid()) then
    raise exception 'No puedes aceptar el reto de tu propio equipo.';
  end if;
  insert into equipos (nombre, capitan_id) values (coalesce(nullif(trim(p_equipo),''),'Equipo rival'), auth.uid()) returning id into v_equipo;
  insert into equipo_jugadores (equipo_id, jugador_id) values (v_equipo, auth.uid());
  update publicaciones set rival_equipo_id = v_equipo where id = p_publicacion;
end $$;

-- 7) Teléfonos del equipo: solo los ve quien es parte del equipo
create or replace function public.contactos_equipo(p_equipo uuid)
returns table (nombre_completo text, telefono text, posicion posicion)
language sql security definer set search_path = public stable as $$
  select p.nombre_completo, p.telefono, p.posicion
  from equipo_jugadores ej join perfiles p on p.id = ej.jugador_id
  where ej.equipo_id = p_equipo
    and exists (select 1 from equipo_jugadores yo where yo.equipo_id = p_equipo and yo.jugador_id = auth.uid())
$$;

-- 8) Permitir que cada usuario actualice su foto en el almacenamiento
drop policy if exists "ver fotos" on storage.objects;
create policy "ver fotos" on storage.objects for select using (bucket_id = 'fotos');

-- 9) Seguridad: las acciones solo se hacen con las funciones de arriba (que validan las reglas)
drop policy if exists "crear equipo como capitan" on equipos;
drop policy if exists "unirse a un equipo" on equipo_jugadores;
drop policy if exists "salir de un equipo" on equipo_jugadores;
drop policy if exists "capitan publica" on publicaciones;
drop policy if exists "capitan indica posiciones" on publicacion_posiciones;

-- El usuario solo puede cambiar su foto, posición y distrito (no sus victorias ni su conducta)
revoke update on perfiles from anon, authenticated;
grant update (foto_url, posicion, distrito) on perfiles to authenticated;

-- 10) Crear el perfil de quienes se registraron antes de ejecutar este archivo
insert into perfiles (id, nombre_completo, telefono, posicion, distrito)
select u.id, u.raw_user_meta_data->>'nombre_completo', u.raw_user_meta_data->>'telefono',
       (u.raw_user_meta_data->>'posicion')::posicion, u.raw_user_meta_data->>'distrito'
from auth.users u
where u.raw_user_meta_data->>'nombre_completo' is not null
  and not exists (select 1 from perfiles p where p.id = u.id);

-- Avisar a Supabase que recargue la lista de funciones
notify pgrst, 'reload schema';

-- 11) Permisos de lectura para usuarios con sesión (las reglas RLS siguen filtrando qué ve cada uno).
--     Los proyectos nuevos de Supabase no los dan automáticamente.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function public.telefono_disponible(text) to anon;
notify pgrst, 'reload schema';
