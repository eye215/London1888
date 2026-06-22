create extension if not exists pgcrypto;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^010-[0-9]{4}-[0-9]{4}$'),
  num_people integer not null check (num_people between 1 and 100),
  schedule text not null check (schedule in (
    '2026-07-25 13:00', '2026-07-25 16:00',
    '2026-07-26 13:00', '2026-07-26 16:00'
  )),
  actor_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  actor_name text not null,
  message text check (message is null or char_length(message) <= 300),
  booking_number text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 40),
  schedule text not null,
  review_content text not null check (char_length(review_content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists reservations_created_at_idx on public.reservations(created_at desc);
create index if not exists reservations_schedule_idx on public.reservations(schedule);
create index if not exists messages_reservation_id_idx on public.messages(reservation_id);

create or replace view public.public_messages
with (security_barrier = true)
as
select id, actor_name, message, created_at
from public.messages
where message is not null and char_length(message) > 0;

alter table public.reservations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "public reservation insert" on public.reservations;
create policy "public reservation insert" on public.reservations
for insert to anon, authenticated with check (true);

drop policy if exists "public message insert" on public.messages;
create policy "public message insert" on public.messages
for insert to anon, authenticated with check (true);

drop policy if exists "public review insert" on public.reviews;
create policy "public review insert" on public.reviews
for insert to anon, authenticated with check (true);

revoke all on public.reservations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.reviews from anon, authenticated;
grant insert on public.reservations to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant insert on public.reviews to anon, authenticated;
revoke all on public.public_messages from public, anon, authenticated;
grant select on public.public_messages to anon, authenticated;
