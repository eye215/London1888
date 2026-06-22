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
  if p_password <> 'Dkdlen28!' then
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
    r.created_at
  from public.reservations r
  order by r.created_at desc;
end;
$$;

grant execute on function public.list_reservations_admin(text) to anon, authenticated;
