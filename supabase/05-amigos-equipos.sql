-- =====================================================================
-- Fútbol Naval · Amigos y equipos propios
-- Ejecutar DESPUÉS de 01 a 04. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------- AMISTADES ----------
do $$ begin
  create type estado_amistad as enum ('pendiente','aceptada');
exception when duplicate_object then null; end $$;

create table if not exists amistades (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references perfiles(id) on delete cascade,
  receptor_id uuid not null references perfiles(id) on delete cascade,
  estado estado_amistad not null default 'pendiente',
  creado_en timestamptz not null default now(),
  check (solicitante_id <> receptor_id)
);
-- Una sola relación por pareja, sin importar quién la envió
create unique index if not exists amistades_pareja_unica
  on amistades (least(solicitante_id, receptor_id), greatest(solicitante_id, receptor_id));

alter table amistades enable row level security;
drop policy if exists "ver mis amistades" on amistades;
create policy "ver mis amistades" on amistades for select to authenticated
  using (auth.uid() in (solicitante_id, receptor_id));
grant select on amistades to authenticated;

-- ¿Son amigos a y b?
create or replace function public.son_amigos(a uuid, b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from amistades where estado = 'aceptada'
                 and ((solicitante_id = a and receptor_id = b) or (solicitante_id = b and receptor_id = a)))
$$;

-- Lista de ids de amigos de un jugador
create or replace function public.ids_amigos(p_jugador uuid)
returns setof uuid language sql security definer set search_path = public stable as $$
  select case when solicitante_id = p_jugador then receptor_id else solicitante_id end
  from amistades where estado = 'aceptada' and p_jugador in (solicitante_id, receptor_id)
$$;

-- Estado de la amistad entre yo y otro: ninguna / enviada / recibida / amigos
create or replace function public.estado_amistad_con(p_jugador uuid)
returns text language sql security definer set search_path = public stable as $$
  select coalesce((
    select case when estado = 'aceptada' then 'amigos'
                when solicitante_id = auth.uid() then 'enviada' else 'recibida' end
    from amistades
    where (solicitante_id = auth.uid() and receptor_id = p_jugador)
       or (solicitante_id = p_jugador and receptor_id = auth.uid())
  ), 'ninguna')
$$;

-- Resumen para el perfil de un jugador: total de amigos, en común y estado
create or replace function public.resumen_amistad(p_jugador uuid)
returns table (total_amigos int, en_comun int, estado text)
language sql security definer set search_path = public stable as $$
  select (select count(*)::int from ids_amigos(p_jugador)),
         (select count(*)::int from ids_amigos(p_jugador) x where x in (select ids_amigos(auth.uid()))),
         estado_amistad_con(p_jugador)
$$;

-- Amigos en común (alias y foto)
create or replace function public.amigos_en_comun(p_jugador uuid)
returns table (id uuid, alias text, foto_url text)
language sql security definer set search_path = public stable as $$
  select p.id, p.alias, p.foto_url from perfiles p
  where p.id in (select ids_amigos(p_jugador)) and p.id in (select ids_amigos(auth.uid()))
  order by p.alias
$$;

-- Buscar jugadores por alias
create or replace function public.buscar_jugadores(p_texto text)
returns table (id uuid, alias text, foto_url text, posicion posicion, distrito text,
               conducta numeric, estado text, en_comun int)
language sql security definer set search_path = public stable as $$
  select j.id, j.alias, j.foto_url, j.posicion, j.distrito, j.conducta,
         estado_amistad_con(j.id),
         (select count(*)::int from ids_amigos(j.id) x where x in (select ids_amigos(auth.uid())))
  from jugadores_publico j
  where auth.uid() is not null and length(trim(p_texto)) >= 2
    and j.alias ilike '%' || trim(p_texto) || '%' and j.id <> auth.uid()
  order by (lower(j.alias) = lower(trim(p_texto))) desc, j.alias
  limit 30
$$;

-- Mis amigos y mis solicitudes (recibidas y enviadas)
create or replace function public.mis_amistades()
returns table (id uuid, alias text, foto_url text, posicion posicion, conducta numeric, estado text)
language sql security definer set search_path = public stable as $$
  select j.id, j.alias, j.foto_url, j.posicion, j.conducta,
         case when a.estado = 'aceptada' then 'amigos'
              when a.solicitante_id = auth.uid() then 'enviada' else 'recibida' end
  from amistades a
  join jugadores_publico j on j.id = case when a.solicitante_id = auth.uid() then a.receptor_id else a.solicitante_id end
  where auth.uid() in (a.solicitante_id, a.receptor_id)
  order by j.alias
$$;

create or replace function public.enviar_solicitud_amistad(p_jugador uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_estado text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_jugador = auth.uid() then raise exception 'No puedes agregarte a ti mismo.'; end if;
  if not exists (select 1 from perfiles where id = p_jugador) then raise exception 'El jugador no existe.'; end if;
  v_estado := estado_amistad_con(p_jugador);
  if v_estado = 'amigos' then raise exception 'Ya son amigos.'; end if;
  if v_estado = 'enviada' then raise exception 'Ya le enviaste una solicitud.'; end if;
  if v_estado = 'recibida' then  -- él ya me la había enviado: se aceptan los dos
    update amistades set estado = 'aceptada'
    where solicitante_id = p_jugador and receptor_id = auth.uid();
    return;
  end if;
  insert into amistades (solicitante_id, receptor_id) values (auth.uid(), p_jugador);
end $$;

create or replace function public.responder_amistad(p_jugador uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_aceptar then
    update amistades set estado = 'aceptada'
    where solicitante_id = p_jugador and receptor_id = auth.uid() and estado = 'pendiente';
    if not found then raise exception 'No tienes una solicitud de este jugador.'; end if;
  else
    delete from amistades where solicitante_id = p_jugador and receptor_id = auth.uid() and estado = 'pendiente';
  end if;
end $$;

-- Cancelar una solicitud enviada o eliminar a un amigo
create or replace function public.eliminar_amistad(p_jugador uuid)
returns void language sql security definer set search_path = public as $$
  delete from amistades
  where (solicitante_id = auth.uid() and receptor_id = p_jugador)
     or (solicitante_id = p_jugador and receptor_id = auth.uid() and estado = 'aceptada')
$$;

-- ---------- EQUIPOS PROPIOS ----------
do $$ begin
  create type estado_miembro as enum ('invitado','solicitado','miembro');
exception when duplicate_object then null; end $$;

create table if not exists equipos_fijos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 3 and 40),
  capitan_id uuid not null references perfiles(id) on delete cascade,
  creado_en timestamptz not null default now()
);
create unique index if not exists equipos_fijos_nombre_unico on equipos_fijos (lower(nombre));

create table if not exists equipo_fijo_miembros (
  equipo_id uuid not null references equipos_fijos(id) on delete cascade,
  jugador_id uuid not null references perfiles(id) on delete cascade,
  estado estado_miembro not null,
  creado_en timestamptz not null default now(),
  primary key (equipo_id, jugador_id)
);

alter table equipos_fijos enable row level security;
alter table equipo_fijo_miembros enable row level security;
drop policy if exists "leer equipos fijos" on equipos_fijos;
create policy "leer equipos fijos" on equipos_fijos for select to authenticated using (true);
drop policy if exists "leer miembros" on equipo_fijo_miembros;
create policy "leer miembros" on equipo_fijo_miembros for select to authenticated
  using (estado = 'miembro' or jugador_id = auth.uid()
         or exists (select 1 from equipos_fijos e where e.id = equipo_id and e.capitan_id = auth.uid()));
grant select on equipos_fijos, equipo_fijo_miembros to authenticated;

-- SUPUESTO: máximo 12 integrantes por equipo (7 titulares + 5 suplentes)
create or replace function public.crear_equipo_fijo(p_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if exists (select 1 from equipos_fijos where lower(nombre) = lower(trim(p_nombre))) then
    raise exception 'Ya existe un equipo con ese nombre.';
  end if;
  insert into equipos_fijos (nombre, capitan_id) values (trim(p_nombre), auth.uid()) returning id into v_id;
  insert into equipo_fijo_miembros (equipo_id, jugador_id, estado) values (v_id, auth.uid(), 'miembro');
  return v_id;
end $$;

create or replace function public.equipo_lleno(p_equipo uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select (select count(*) from equipo_fijo_miembros where equipo_id = p_equipo and estado = 'miembro') >= 12
$$;

-- El capitán invita a un amigo
create or replace function public.invitar_a_equipo(p_equipo uuid, p_jugador uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_estado estado_miembro;
begin
  if not exists (select 1 from equipos_fijos where id = p_equipo and capitan_id = auth.uid()) then
    raise exception 'Solo el capitán puede invitar jugadores.';
  end if;
  if not son_amigos(auth.uid(), p_jugador) then raise exception 'Solo puedes invitar a tus amigos.'; end if;
  if equipo_lleno(p_equipo) then raise exception 'El equipo ya tiene 12 integrantes.'; end if;
  select estado into v_estado from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = p_jugador;
  if v_estado = 'miembro' then raise exception 'Ya es parte del equipo.'; end if;
  if v_estado = 'invitado' then raise exception 'Ya lo invitaste.'; end if;
  if v_estado = 'solicitado' then  -- él ya lo había pedido: entra directo
    update equipo_fijo_miembros set estado = 'miembro' where equipo_id = p_equipo and jugador_id = p_jugador;
    return;
  end if;
  insert into equipo_fijo_miembros (equipo_id, jugador_id, estado) values (p_equipo, p_jugador, 'invitado');
end $$;

-- Un amigo del capitán pide unirse
create or replace function public.solicitar_equipo(p_equipo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_capitan uuid; v_estado estado_miembro;
begin
  select capitan_id into v_capitan from equipos_fijos where id = p_equipo;
  if v_capitan is null then raise exception 'El equipo no existe.'; end if;
  if not son_amigos(auth.uid(), v_capitan) then
    raise exception 'Solo los amigos del capitán pueden pedir unirse. Envíale una solicitud de amistad primero.';
  end if;
  if equipo_lleno(p_equipo) then raise exception 'El equipo ya tiene 12 integrantes.'; end if;
  select estado into v_estado from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = auth.uid();
  if v_estado = 'miembro' then raise exception 'Ya eres parte del equipo.'; end if;
  if v_estado = 'solicitado' then raise exception 'Ya enviaste tu solicitud.'; end if;
  if v_estado = 'invitado' then  -- ya estaba invitado: entra directo
    update equipo_fijo_miembros set estado = 'miembro' where equipo_id = p_equipo and jugador_id = auth.uid();
    return;
  end if;
  insert into equipo_fijo_miembros (equipo_id, jugador_id, estado) values (p_equipo, auth.uid(), 'solicitado');
end $$;

-- Aceptar o rechazar: el capitán responde solicitudes; el jugador responde invitaciones
create or replace function public.responder_equipo(p_equipo uuid, p_jugador uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_capitan uuid; v_estado estado_miembro;
begin
  select capitan_id into v_capitan from equipos_fijos where id = p_equipo;
  select estado into v_estado from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = p_jugador;
  if not ((v_estado = 'solicitado' and auth.uid() = v_capitan)
       or (v_estado = 'invitado' and auth.uid() = p_jugador)) then
    raise exception 'No tienes nada pendiente que responder aquí.';
  end if;
  if p_aceptar then
    if equipo_lleno(p_equipo) then raise exception 'El equipo ya tiene 12 integrantes.'; end if;
    update equipo_fijo_miembros set estado = 'miembro' where equipo_id = p_equipo and jugador_id = p_jugador;
  else
    delete from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = p_jugador;
  end if;
end $$;

-- Salir del equipo (o cancelar mi solicitud); el capitán quita a alguien
create or replace function public.salir_equipo_fijo(p_equipo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from equipos_fijos where id = p_equipo and capitan_id = auth.uid()) then
    raise exception 'Eres el capitán: para irte, elimina el equipo.';
  end if;
  delete from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = auth.uid();
end $$;

create or replace function public.quitar_de_equipo(p_equipo uuid, p_jugador uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from equipos_fijos where id = p_equipo and capitan_id = auth.uid()) then
    raise exception 'Solo el capitán puede quitar jugadores.';
  end if;
  if p_jugador = auth.uid() then raise exception 'No puedes quitarte a ti mismo.'; end if;
  delete from equipo_fijo_miembros where equipo_id = p_equipo and jugador_id = p_jugador;
end $$;

create or replace function public.eliminar_equipo_fijo(p_equipo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from equipos_fijos where id = p_equipo and capitan_id = auth.uid();
  if not found then raise exception 'Solo el capitán puede eliminar el equipo.'; end if;
end $$;

-- Pendientes para mostrar avisos en el menú
create or replace function public.mis_pendientes()
returns table (amigos int, equipos int)
language sql security definer set search_path = public stable as $$
  select (select count(*)::int from amistades where receptor_id = auth.uid() and estado = 'pendiente'),
         (select count(*)::int from equipo_fijo_miembros m
          where (m.jugador_id = auth.uid() and m.estado = 'invitado')
             or (m.estado = 'solicitado' and exists (select 1 from equipos_fijos e where e.id = m.equipo_id and e.capitan_id = auth.uid())))
$$;

-- Permisos
grant execute on all functions in schema public to authenticated;
revoke execute on function public.unirse(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
