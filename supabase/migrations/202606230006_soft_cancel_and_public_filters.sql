alter table public.reservations
  add column if not exists admin_deleted_at timestamptz;

drop view if exists public.public_messages;

create view public.public_messages
with (security_barrier = true)
as
select
  m.id,
  m.actor_name,
  m.message,
  coalesce(m.author_display, m.nickname, '익명') as author_display,
  m.source,
  m.created_at
from public.messages m
left join public.reservations r
  on r.id = m.reservation_id
where m.message is not null
  and char_length(m.message) > 0
  and (
    m.reservation_id is null
    or (r.id is not null and r.admin_deleted_at is null)
  )
order by m.created_at desc;

revoke all on public.public_messages from public, anon, authenticated;
grant select on public.public_messages to anon, authenticated;

create or replace function public.find_reservation_by_contact(p_name text, p_phone text)
returns table(
  id uuid,
  num_people integer,
  schedule text,
  actor_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.num_people, r.schedule, r.actor_name, r.created_at
  from public.reservations r
  where r.name = trim(p_name)
    and r.phone = p_phone
    and r.admin_deleted_at is null
  order by r.created_at desc
  limit 1;
$$;

create or replace function public.update_reservation_by_contact(
  p_name text,
  p_phone text,
  p_num_people integer,
  p_schedule text
)
returns table(id uuid, num_people integer, schedule text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if p_num_people < 1 or p_num_people > 100 then
    raise exception 'invalid num_people';
  end if;

  if p_schedule not in ('2026-07-25 13:00','2026-07-25 16:00','2026-07-26 13:00','2026-07-26 16:00') then
    raise exception 'invalid schedule';
  end if;

  select r.id into target_id
  from public.reservations r
  where r.name = trim(p_name)
    and r.phone = p_phone
    and r.admin_deleted_at is null
  order by r.created_at desc
  limit 1;

  if target_id is null then
    return;
  end if;

  update public.reservations r
  set num_people = p_num_people,
      schedule = p_schedule
  where r.id = target_id
    and r.admin_deleted_at is null;

  return query select target_id, p_num_people, p_schedule;
end;
$$;

drop function if exists public.cancel_reservation_by_contact(text, text);

create or replace function public.cancel_reservation_by_contact(p_name text, p_phone text)
returns table(id uuid, admin_deleted_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select r.id into target_id
  from public.reservations r
  where r.name = trim(p_name)
    and r.phone = p_phone
    and r.admin_deleted_at is null
  order by r.created_at desc
  limit 1;

  if target_id is null then
    return;
  end if;

  update public.reservations r
  set admin_deleted_at = coalesce(r.admin_deleted_at, now())
  where r.id = target_id;

  return query
  select r.id, r.admin_deleted_at
  from public.reservations r
  where r.id = target_id;
end;
$$;

grant execute on function public.find_reservation_by_contact(text, text) to anon, authenticated;
grant execute on function public.update_reservation_by_contact(text, text, integer, text) to anon, authenticated;
grant execute on function public.cancel_reservation_by_contact(text, text) to anon, authenticated;
