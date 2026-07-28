begin;

create table if not exists public.barber_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  business_name text,
  experience_years integer,
  bio text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barber_applications_experience_years_check
    check (experience_years is null or experience_years >= 0)
);

create index if not exists barber_applications_status_created_idx
  on public.barber_applications (status, created_at desc);

create or replace function public.set_barber_application_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_barber_applications_updated_at
  on public.barber_applications;

create trigger set_barber_applications_updated_at
before update on public.barber_applications
for each row execute function public.set_barber_application_updated_at();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(trim(role)) = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

alter table public.barber_applications enable row level security;

drop policy if exists "Applicants can view their own barber application"
  on public.barber_applications;
create policy "Applicants can view their own barber application"
on public.barber_applications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can view all barber applications"
  on public.barber_applications;
create policy "Admins can view all barber applications"
on public.barber_applications
for select
to authenticated
using (public.current_user_is_admin());

create or replace function public.create_barber_application_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_account_type text;
begin
  requested_account_type := lower(
    trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'customer'))
  );

  if requested_account_type = 'barber' then
    insert into public.barber_applications (
      user_id,
      full_name,
      email,
      phone,
      business_name,
      experience_years,
      bio
    )
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Barber applicant'),
      coalesce(new.email, ''),
      nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
      case
        when (new.raw_user_meta_data ->> 'experience_years') ~ '^\d+$'
          then (new.raw_user_meta_data ->> 'experience_years')::integer
        else null
      end,
      nullif(trim(new.raw_user_meta_data ->> 'bio'), '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists create_barber_application_after_signup on auth.users;
create trigger create_barber_application_after_signup
after insert on auth.users
for each row execute function public.create_barber_application_for_new_user();

create or replace function public.approve_barber_application(application_id uuid)
returns public.barber_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  application public.barber_applications;
begin
  if not public.current_user_is_admin() then
    raise exception 'Only administrators can approve barber applications.'
      using errcode = '42501';
  end if;

  select * into application
  from public.barber_applications
  where id = application_id
  for update;

  if application.id is null then
    raise exception 'Barber application not found.'
      using errcode = 'P0002';
  end if;

  if application.status <> 'pending' then
    raise exception 'Only pending applications can be approved.';
  end if;

  update public.profiles
  set role = 'barber', updated_at = now()
  where id = application.user_id;

  if not found then
    raise exception 'The applicant profile does not exist.';
  end if;

  update public.barber_applications
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = application_id
  returning * into application;

  insert into public.square_connections (
    barber_id,
    barber_slug,
    barber_name,
    status
  )
  values (
    application.user_id,
    lower(trim(both '-' from regexp_replace(application.full_name, '[^a-zA-Z0-9]+', '-', 'g')))
      || '-' || left(application.user_id::text, 8),
    application.full_name,
    'disconnected'
  )
  on conflict (barber_slug) do nothing;

  return application;
end;
$$;

create or replace function public.reject_barber_application(
  application_id uuid,
  reason text default null
)
returns public.barber_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  application public.barber_applications;
begin
  if not public.current_user_is_admin() then
    raise exception 'Only administrators can reject barber applications.'
      using errcode = '42501';
  end if;

  update public.barber_applications
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = nullif(trim(reason), '')
  where id = application_id
    and status = 'pending'
  returning * into application;

  if application.id is null then
    raise exception 'Pending barber application not found.'
      using errcode = 'P0002';
  end if;

  return application;
end;
$$;

revoke all on function public.approve_barber_application(uuid) from public;
revoke all on function public.reject_barber_application(uuid, text) from public;
grant execute on function public.approve_barber_application(uuid) to authenticated;
grant execute on function public.reject_barber_application(uuid, text) to authenticated;

alter table public.square_connections
  add column if not exists barber_id uuid;

create unique index if not exists square_connections_barber_id_unique
  on public.square_connections (barber_id)
  where barber_id is not null;

commit;
