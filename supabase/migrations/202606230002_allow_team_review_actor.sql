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
  normalized_phone text;
  is_tester boolean;
  show_time timestamptz;
begin
  normalized_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  is_tester := trim(coalesce(p_name, '')) = '김유리' and normalized_phone = '01092974813';

  select r.* into target
  from public.reservations r
  where r.name = trim(coalesce(p_name, ''))
    and regexp_replace(r.phone, '[^0-9]', '', 'g') = normalized_phone
  order by r.created_at desc
  limit 1;

  if target.id is null and not is_tester then
    raise exception 'reservation not found';
  end if;

  if char_length(trim(coalesce(p_review_content, ''))) < 1 or char_length(trim(coalesce(p_review_content, ''))) > 1000 then
    raise exception 'invalid review content';
  end if;

  if trim(coalesce(p_actor_name, '')) not in ('도영','준범','영완','양욱','은비','유리','흥섭','병주','해찬','오현','채린','1888 런던의밤 팀') then
    raise exception 'invalid actor';
  end if;

  if not is_tester then
    show_time := (replace(target.schedule, ' ', 'T') || ':00+09:00')::timestamptz;
    if now() < show_time then
      raise exception 'review is not open yet';
    end if;
  end if;

  masked_name := case
    when char_length(trim(coalesce(p_name, ''))) <= 1 then trim(coalesce(p_name, ''))
    when char_length(trim(coalesce(p_name, ''))) = 2 then substring(trim(p_name), 1, 1) || '*'
    else substring(trim(p_name), 1, 1) || repeat('*', char_length(trim(p_name)) - 2) || right(trim(p_name), 1)
  end;

  insert into public.reviews(reservation_id, nickname, schedule, actor_name, author_display, review_content)
  values (
    target.id,
    masked_name,
    coalesce(target.schedule, '2026-07-25 13:00'),
    trim(p_actor_name),
    masked_name,
    trim(p_review_content)
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.submit_verified_review(text, text, text, text) to anon, authenticated;
