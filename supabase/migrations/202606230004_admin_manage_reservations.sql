alter table public.reservations
  add column if not exists admin_deleted_at timestamptz;

drop function if exists public.list_reservations_admin(text);

create or replace function public.list_reservations_admin(p_password text)
returns table(
  id uuid,
  name text,
  phone text,
  num_people integer,
  schedule text,
  actor_name text,
  message text,
  created_at timestamptz,
  admin_deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password <> 'Dkdlen33!' then
    raise exception 'unauthorized';
  end if;

  return query
  select
    r.id,
    r.name,
    r.phone,
    r.num_people,
    r.schedule,
    r.actor_name,
    (
      select m.message
      from public.messages m
      where m.reservation_id = r.id
        and m.message is not null
        and char_length(m.message) > 0
      order by m.created_at desc
      limit 1
    ) as message,
    r.created_at,
    r.admin_deleted_at
  from public.reservations r
  order by
    case when r.admin_deleted_at is null then 0 else 1 end,
    r.created_at desc;
end;
$$;

create or replace function public.admin_update_reservation(
  p_password text,
  p_id uuid,
  p_num_people integer,
  p_schedule text
)
returns table(id uuid, num_people integer, schedule text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password <> 'Dkdlen33!' then
    raise exception 'unauthorized';
  end if;

  if p_num_people < 1 or p_num_people > 100 then
    raise exception 'invalid num_people';
  end if;

  if p_schedule not in ('2026-07-25 13:00','2026-07-25 16:00','2026-07-26 13:00','2026-07-26 16:00') then
    raise exception 'invalid schedule';
  end if;

  update public.reservations r
  set num_people = p_num_people,
      schedule = p_schedule
  where r.id = p_id
    and r.admin_deleted_at is null;

  return query
  select r.id, r.num_people, r.schedule
  from public.reservations r
  where r.id = p_id;
end;
$$;

create or replace function public.admin_soft_delete_reservation(
  p_password text,
  p_id uuid
)
returns table(id uuid, admin_deleted_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password <> 'Dkdlen33!' then
    raise exception 'unauthorized';
  end if;

  update public.reservations r
  set admin_deleted_at = coalesce(r.admin_deleted_at, now())
  where r.id = p_id;

  return query
  select r.id, r.admin_deleted_at
  from public.reservations r
  where r.id = p_id;
end;
$$;

create or replace function public.list_reviews_admin(p_password text)
returns table(
  id uuid,
  actor_name text,
  author_display text,
  schedule text,
  review_content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password <> 'Dkdlen33!' then
    raise exception 'unauthorized';
  end if;

  return query
  select r.id,
         coalesce(r.actor_name, '전체'),
         coalesce(r.author_display, r.nickname, '익명'),
         r.schedule,
         r.review_content,
         r.created_at
  from public.reviews r
  order by r.created_at desc;
end;
$$;

grant execute on function public.list_reservations_admin(text) to anon, authenticated;
grant execute on function public.admin_update_reservation(text, uuid, integer, text) to anon, authenticated;
grant execute on function public.admin_soft_delete_reservation(text, uuid) to anon, authenticated;
grant execute on function public.list_reviews_admin(text) to anon, authenticated;
