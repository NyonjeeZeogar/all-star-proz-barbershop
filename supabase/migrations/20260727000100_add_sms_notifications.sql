begin;

-- -----------------------------------------------------
-- Notification preferences
-- -----------------------------------------------------

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),

  -- Keep this unconstrained for now because the project may use
  -- appointments, profiles, customers, or auth.users as its customer source.
  customer_id uuid,

  email text,
  phone_e164 text,

  email_notifications_enabled boolean not null default true,
  sms_opt_in boolean not null default false,
  sms_notifications_enabled boolean not null default false,

  sms_consent_at timestamptz,
  sms_opt_out_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_customer_id_unique
    unique (customer_id),

  constraint notification_preferences_phone_e164_format
    check (
      phone_e164 is null
      or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),

  constraint notification_preferences_sms_consent_required
    check (
      sms_opt_in = false
      or sms_consent_at is not null
    )
);

create index if not exists notification_preferences_email_idx
  on public.notification_preferences (lower(email))
  where email is not null;

create index if not exists notification_preferences_phone_idx
  on public.notification_preferences (phone_e164)
  where phone_e164 is not null;

-- -----------------------------------------------------
-- Extend the existing notification_logs table
-- -----------------------------------------------------

alter table if exists public.notification_logs
  add column if not exists provider text;

alter table if exists public.notification_logs
  add column if not exists provider_status text;

alter table if exists public.notification_logs
  add column if not exists idempotency_key text;

alter table if exists public.notification_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.notification_logs
  add column if not exists delivered_at timestamptz;

alter table if exists public.notification_logs
  add column if not exists failed_at timestamptz;

alter table if exists public.notification_logs
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists notification_logs_idempotency_key_unique
  on public.notification_logs (idempotency_key)
  where idempotency_key is not null;

create index if not exists notification_logs_provider_message_id_idx
  on public.notification_logs (provider_message_id)
  where provider_message_id is not null;

create index if not exists notification_logs_channel_status_idx
  on public.notification_logs (channel, status);

create index if not exists notification_logs_appointment_idx
  on public.notification_logs (appointment_id)
  where appointment_id is not null;

-- -----------------------------------------------------
-- Automatically maintain updated_at
-- -----------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_set_updated_at
  on public.notification_preferences;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists notification_logs_set_updated_at
  on public.notification_logs;

create trigger notification_logs_set_updated_at
before update on public.notification_logs
for each row
execute function public.set_updated_at();

-- -----------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------

alter table public.notification_preferences enable row level security;

-- Service-role Edge Functions bypass RLS.
-- User-facing policies should be added after we confirm how customers
-- are associated with auth.users in this application.

commit;
