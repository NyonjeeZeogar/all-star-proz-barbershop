begin;

create extension if not exists pgcrypto;

-- =========================================================
-- Service categories
-- =========================================================

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_categories_name_key
  on public.service_categories (name);

create unique index if not exists service_categories_slug_key
  on public.service_categories (slug);

-- =========================================================
-- Repair existing services table
-- =========================================================

alter table public.services
  add column if not exists category_id uuid,
  add column if not exists slug text,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_add_on boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_category_id_fkey'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_category_id_fkey
      foreign key (category_id)
      references public.service_categories(id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists services_slug_key
  on public.services (slug)
  where slug is not null;

create index if not exists idx_services_category_active
  on public.services (category_id, active);

create index if not exists idx_services_active_display_order
  on public.services (active, display_order);

-- =========================================================
-- Pricing settings
-- =========================================================

create table if not exists public.pricing_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (
  setting_key,
  setting_value,
  description
)
values
  (
    'deposit',
    '{"percentage": 50}'::jsonb,
    'Percentage of the service subtotal charged as the booking deposit'
  ),
  (
    'booking_fees',
    '[
      {
        "min_cents": 0,
        "max_cents": 4999,
        "fee_cents": 150
      },
      {
        "min_cents": 5000,
        "max_cents": 10000,
        "fee_cents": 200
      },
      {
        "min_cents": 10001,
        "max_cents": null,
        "fee_cents": 300
      }
    ]'::jsonb,
    'Booking fee tiers based on the full service subtotal'
  ),
  (
    'tips',
    '{
      "enabled": true,
      "percent_options": [10, 15, 20, 25],
      "allow_custom": true
    }'::jsonb,
    'Tip options displayed during checkout'
  )
on conflict (setting_key)
do update set
  setting_value = excluded.setting_value,
  description = excluded.description,
  updated_at = now();

-- =========================================================
-- Updated-at triggers
-- =========================================================

drop trigger if exists service_categories_set_updated_at
  on public.service_categories;

create trigger service_categories_set_updated_at
before update on public.service_categories
for each row
execute function public.set_updated_at();

drop trigger if exists services_set_updated_at
  on public.services;

create trigger services_set_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists pricing_settings_set_updated_at
  on public.pricing_settings;

create trigger pricing_settings_set_updated_at
before update on public.pricing_settings
for each row
execute function public.set_updated_at();

commit;
