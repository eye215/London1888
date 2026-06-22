alter table public.reviews add column if not exists reservation_id uuid references public.reservations(id) on delete set null;
alter table public.reviews add column if not exists actor_name text;
alter table public.reviews add column if not exists author_display text;

create index if not exists reviews_actor_created_idx on public.reviews(actor_name, created_at desc);

create or replace function public.submit_verified_review(
  p_name text,
  p_phone text,
  p_actor_name text,
  p_review_content text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.reservations%rowtype;
  new_id uuid;
  masked_name text;
  is_tester boolean;
  show_time timestamptz;
begin
  is_tester := trim(p_name) = '김유리' and regexp_replace(p_phone, '[^0-9]', '', 'g') = '01092974813';

  select r.* into target
  from public.reservations r
  where r.name = trim(p_name)
    and regexp_replace(r.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  order by r.created_at desc
  limit 1;

  if target.id is null and not is_tester then
    raise exception 'reservation not found';
  end if;

  if char_length(trim(p_review_content)) < 1 or char_length(trim(p_review_content)) > 1000 then
    raise exception 'invalid review content';
  end if;

  if p_actor_name not in ('도영','준범','영완','양욱','은비','유리','흥섭','병주','해찬','오현','채린') then
    raise exception 'invalid actor';
  end if;

  if not is_tester then
    show_time := (replace(target.schedule, ' ', 'T') || ':00+09:00')::timestamptz;
    if now() < show_time then
      raise exception 'review is not open yet';
    end if;
  end if;

  masked_name := case
    when char_length(trim(p_name)) <= 1 then trim(p_name)
    when char_length(trim(p_name)) = 2 then substring(trim(p_name), 1, 1) || '*'
    else substring(trim(p_name), 1, 1) || repeat('*', char_length(trim(p_name)) - 2) || right(trim(p_name), 1)
  end;

  insert into public.reviews(reservation_id, nickname, schedule, actor_name, author_display, review_content)
  values (
    target.id,
    masked_name,
    coalesce(target.schedule, '2026-07-25 13:00'),
    p_actor_name,
    masked_name,
    trim(p_review_content)
  )
  returning id into new_id;

  return new_id;
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
  if p_password <> 'Dkdlen28!' then
    raise exception 'unauthorized';
  end if;

  return query
  select r.id, coalesce(r.actor_name, '전체'), coalesce(r.author_display, r.nickname, '익명'),
         r.schedule, r.review_content, r.created_at
  from public.reviews r
  order by r.created_at desc;
end;
$$;

revoke all on function public.submit_verified_review(text, text, text, text) from public;
revoke all on function public.list_reviews_admin(text) from public;
grant execute on function public.submit_verified_review(text, text, text, text) to anon, authenticated;
grant execute on function public.list_reviews_admin(text) to anon, authenticated;
