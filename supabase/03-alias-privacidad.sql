-- =====================================================================
-- Fútbol Naval · Alias, privacidad y administradores
-- Ejecutar DESPUÉS de 01 y 02. Se puede ejecutar varias veces.
-- =====================================================================

-- 1) Nuevas columnas en perfiles
alter table perfiles add column if not exists alias text;
alter table perfiles add column if not exists es_admin boolean not null default false;
alter table perfiles add column if not exists acepto_datos_en timestamptz;

alter table perfiles drop constraint if exists alias_formato;
alter table perfiles add constraint alias_formato
  check (alias is null or alias ~ '^[A-Za-z0-9_]{3,20}$');
create unique index if not exists perfiles_alias_unico on perfiles (lower(alias));

-- 2) El alias se guarda al registrarse (junto con la aceptación del uso de datos)
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data->>'nombre_completo' is null then
    return new;
  end if;
  insert into public.perfiles (id, nombre_completo, telefono, posicion, distrito, alias, acepto_datos_en)
  values (new.id,
          new.raw_user_meta_data->>'nombre_completo',
          new.raw_user_meta_data->>'telefono',
          (new.raw_user_meta_data->>'posicion')::posicion,
          new.raw_user_meta_data->>'distrito',
          nullif(new.raw_user_meta_data->>'alias', ''),
          case when new.raw_user_meta_data->>'acepto_datos' = 'si' then now() end);
  return new;
end $$;

-- 3) ¿El alias está libre? (se consulta antes de registrarse)
create or replace function public.alias_disponible(p_alias text)
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from perfiles where lower(alias) = lower(p_alias))
$$;
grant execute on function public.alias_disponible(text) to anon, authenticated;

-- 4) Elegir alias UNA sola vez (para quienes se registraron antes de este cambio)
create or replace function public.fijar_alias(p_alias text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_alias !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'El alias debe tener de 3 a 20 caracteres: letras, números o guion bajo, sin espacios.';
  end if;
  if exists (select 1 from perfiles where id = auth.uid() and alias is not null) then
    raise exception 'Tu alias ya está fijado y no se puede cambiar.';
  end if;
  if not public.alias_disponible(p_alias) then raise exception 'Ese alias ya lo usa otro jugador.'; end if;
  update perfiles set alias = p_alias, acepto_datos_en = coalesce(acepto_datos_en, now()) where id = auth.uid();
end $$;

-- 5) Vista pública: SOLO alias (sin nombre, correo ni teléfono)
drop view if exists jugadores_publico;
create view jugadores_publico as
select p.id, p.alias, p.foto_url, p.posicion, p.distrito, p.victorias,
  least(10, greatest(0,
    10 - coalesce((select sum(case d.tipo
                     when 'no_asistio' then 1.5 when 'tarde' then 0.5 when 'abandono' then 1.0
                     when 'verbal' then 2.0 when 'fisica' then 4.0 when 'pago' then 1.5 end) from denuncias d
                   where d.denunciado_id = p.id and d.estado = 'confirmada'),0)
       + p.partidos_limpios * 0.2)) as conducta,
  (select count(*) from calificaciones c where c.calificado_id = p.id) as num_calificaciones,
  case when (select count(*) from calificaciones c where c.calificado_id = p.id) >= 10
       then least(10, (select avg(puntaje) from calificaciones c where c.calificado_id = p.id) + 0.1 * p.victorias)
  end as medalla
from perfiles p;
grant select on jugadores_publico to authenticated;

-- 6) Contactos del equipo: alias y teléfono (sin nombre completo)
drop function if exists public.contactos_equipo(uuid);
create function public.contactos_equipo(p_equipo uuid)
returns table (alias text, telefono text, posicion posicion)
language sql security definer set search_path = public stable as $$
  select p.alias, p.telefono, p.posicion
  from equipo_jugadores ej join perfiles p on p.id = ej.jugador_id
  where ej.equipo_id = p_equipo
    and exists (select 1 from equipo_jugadores yo where yo.equipo_id = p_equipo and yo.jugador_id = auth.uid())
$$;
grant execute on function public.contactos_equipo(uuid) to authenticated;

-- 7) Lista completa de usuarios: SOLO para administradores
create or replace function public.es_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select es_admin from perfiles where id = auth.uid()), false)
$$;

create or replace function public.admin_usuarios()
returns table (id uuid, alias text, nombre_completo text, correo text, telefono text,
               posicion posicion, distrito text, es_admin boolean, registrado_en timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.es_admin() then raise exception 'Solo los administradores pueden ver esta información.'; end if;
  return query
    select p.id, p.alias, p.nombre_completo, u.email::text, p.telefono, p.posicion, p.distrito, p.es_admin, p.creado_en
    from perfiles p join auth.users u on u.id = p.id
    order by p.creado_en desc;
end $$;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.admin_usuarios() to authenticated;

-- 8) El primer usuario registrado (el dueño de la página) queda como administrador
update perfiles set es_admin = true
where id = (select id from perfiles order by creado_en asc limit 1);

-- 9) El usuario NO puede cambiarse el alias ni hacerse administrador por su cuenta
revoke update on perfiles from anon, authenticated;
grant update (foto_url, posicion, distrito) on perfiles to authenticated;

notify pgrst, 'reload schema';
