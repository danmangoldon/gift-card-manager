-- Gift Card Manager management update
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- It fixes Dan's admin role, table privileges, RLS policies,
-- and restricts restoration of used cards to admins.

-- Ensure existing authenticated users have the required PostgreSQL privileges.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.gift_cards to authenticated;
grant select on public.gift_card_audit_log to authenticated;

-- Ensure Dan's current profile is admin.
update public.profiles
set role = 'admin'
where lower(email) = 'dan.mangold@on-running.com';

-- Re-create / backfill profile in case the current auth user was deleted and re-created.
insert into public.profiles (id, email, role)
select
  id,
  lower(coalesce(email, '')),
  case
    when lower(coalesce(email, '')) = 'dan.mangold@on-running.com' then 'admin'
    else 'viewer'
  end
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  role = case
    when excluded.email = 'dan.mangold@on-running.com' then 'admin'
    else public.profiles.role
  end;

-- Keep new / changed auth users synchronized with profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    case
      when lower(coalesce(new.email, '')) = 'dan.mangold@on-running.com' then 'admin'
      else 'viewer'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = case
      when excluded.email = 'dan.mangold@on-running.com' then 'admin'
      else public.profiles.role
    end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'viewer'
  );
$$;

alter table public.profiles enable row level security;
alter table public.gift_cards enable row level security;
alter table public.gift_card_audit_log enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "authenticated users read gift cards" on public.gift_cards;
create policy "authenticated users read gift cards"
on public.gift_cards
for select
to authenticated
using (true);

drop policy if exists "managers and admins add gift cards" on public.gift_cards;
create policy "managers and admins add gift cards"
on public.gift_cards
for insert
to authenticated
with check (public.current_role() in ('manager', 'admin'));

drop policy if exists "managers and admins update gift cards" on public.gift_cards;
create policy "managers and admins update gift cards"
on public.gift_cards
for update
to authenticated
using (public.current_role() in ('manager', 'admin'))
with check (public.current_role() in ('manager', 'admin'));

drop policy if exists "admins read audit log" on public.gift_card_audit_log;
create policy "admins read audit log"
on public.gift_card_audit_log
for select
to authenticated
using (public.current_role() = 'admin');

-- Managers may mark cards used, but only admins can restore Used -> Available.
create or replace function public.guard_gift_card_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'used'
     and new.status = 'available'
     and public.current_role() <> 'admin' then
    raise exception 'Only admins can restore a used gift card';
  end if;

  return new;
end;
$$;

drop trigger if exists gift_card_status_guard on public.gift_cards;
create trigger gift_card_status_guard
before update on public.gift_cards
for each row execute procedure public.guard_gift_card_status_change();

-- Verification result:
select id, email, role
from public.profiles
where lower(email) = 'dan.mangold@on-running.com';
