create or replace function public.list_reservations_admin(p_password text)
returns table(
  id uuid,
  name text,
  phone text,
  num_people integer,
  schedule text,
  actor_name text,
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
  select r.id, r.name, r.phone, r.num_people, r.schedule, r.actor_name, r.created_at
  from public.reservations r
  order by r.created_at desc;
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
grant execute on function public.list_reviews_admin(text) to anon, authenticated;
