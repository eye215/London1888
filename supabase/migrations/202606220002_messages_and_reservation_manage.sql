alter table public.messages add column if not exists author_display text;
alter table public.messages add column if not exists author_name text;
alter table public.messages add column if not exists author_phone_last4 text;
alter table public.messages add column if not exists source text not null default 'reservation';
alter table public.messages add column if not exists nickname text;

alter table public.messages alter column reservation_id drop not null;
alter table public.messages alter column booking_number drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_source_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages add constraint messages_source_check check (source in ('reservation', 'supporter'));
  end if;
end $$;

drop view if exists public.public_messages;

create view public.public_messages
with (security_barrier = true)
as
select
  id,
  actor_name,
  message,
  coalesce(author_display, nickname, '익명') as author_display,
  source,
  created_at
from public.messages
where message is not null
  and char_length(message) > 0
order by created_at desc;

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
  order by r.created_at desc
  limit 1;

  if target_id is null then
    return;
  end if;

  update public.reservations r
  set num_people = p_num_people,
      schedule = p_schedule
  where r.id = target_id;

  return query select target_id, p_num_people, p_schedule;
end;
$$;

create or replace function public.cancel_reservation_by_contact(p_name text, p_phone text)
returns table(id uuid)
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
  order by r.created_at desc
  limit 1;

  if target_id is null then
    return;
  end if;

  delete from public.reservations r
  where r.id = target_id;

  return query select target_id;
end;
$$;

grant execute on function public.find_reservation_by_contact(text, text) to anon, authenticated;
grant execute on function public.update_reservation_by_contact(text, text, integer, text) to anon, authenticated;
grant execute on function public.cancel_reservation_by_contact(text, text) to anon, authenticated;
