begin;

-- Tax and pricing snapshot update.
-- Change tax_rate percentage below to the actual combined rate for your shop.
-- Example: 8.25 means 8.25%.

insert into public.pricing_settings (
  setting_key,
  setting_value,
  description
)
values
  (
    'tax_rate',
    '{"percentage": 0}'::jsonb,
    'Combined sales-tax percentage. Set this to the rate required for the shop location.'
  ),
  (
    'deposit',
    '{"percentage": 50}'::jsonb,
    'Minimum percentage of the service subtotal charged as the deposit.'
  ),
  (
    'booking_fees',
    '[
      {"min_cents": 0, "max_cents": 4999, "fee_cents": 150},
      {"min_cents": 5000, "max_cents": 10000, "fee_cents": 200},
      {"min_cents": 10001, "max_cents": null, "fee_cents": 300}
    ]'::jsonb,
    'Booking-fee tiers based on the service subtotal.'
  )
on conflict (setting_key)
do update set
  setting_value = excluded.setting_value,
  description = excluded.description,
  updated_at = now();

alter table public.services
  add column if not exists taxable boolean not null default true;

alter table public.appointments
  add column if not exists service_subtotal_cents integer not null default 0,
  add column if not exists taxable_subtotal_cents integer not null default 0,
  add column if not exists tax_rate numeric(8,4) not null default 0,
  add column if not exists tax_cents integer not null default 0,
  add column if not exists booking_fee_cents integer not null default 0,
  add column if not exists tip_cents integer not null default 0,
  add column if not exists deposit_cents integer not null default 0,
  add column if not exists charged_today_cents integer not null default 0,
  add column if not exists remaining_balance_cents integer not null default 0,
  add column if not exists pricing_snapshot jsonb;

alter table public.appointments
  drop constraint if exists appointments_service_subtotal_cents_nonnegative,
  add constraint appointments_service_subtotal_cents_nonnegative
    check (service_subtotal_cents >= 0),
  drop constraint if exists appointments_tax_cents_nonnegative,
  add constraint appointments_tax_cents_nonnegative
    check (tax_cents >= 0),
  drop constraint if exists appointments_booking_fee_cents_nonnegative,
  add constraint appointments_booking_fee_cents_nonnegative
    check (booking_fee_cents >= 0),
  drop constraint if exists appointments_tip_cents_nonnegative,
  add constraint appointments_tip_cents_nonnegative
    check (tip_cents >= 0),
  drop constraint if exists appointments_deposit_cents_nonnegative,
  add constraint appointments_deposit_cents_nonnegative
    check (deposit_cents >= 0),
  drop constraint if exists appointments_charged_today_cents_nonnegative,
  add constraint appointments_charged_today_cents_nonnegative
    check (charged_today_cents >= 0),
  drop constraint if exists appointments_remaining_balance_cents_nonnegative,
  add constraint appointments_remaining_balance_cents_nonnegative
    check (remaining_balance_cents >= 0);

create or replace function public.calculate_booking_fee_cents(
  p_service_subtotal_cents integer
)
returns integer
language sql
stable
as $$
  select case
    when greatest(coalesce(p_service_subtotal_cents, 0), 0) < 5000 then 150
    when greatest(coalesce(p_service_subtotal_cents, 0), 0) <= 10000 then 200
    else 300
  end;
$$;

create or replace function public.calculate_deposit_cents(
  p_service_subtotal_cents integer,
  p_deposit_percentage numeric default 50
)
returns integer
language sql
immutable
as $$
  select greatest(
    0,
    ceil(
      greatest(coalesce(p_service_subtotal_cents, 0), 0)
      * greatest(coalesce(p_deposit_percentage, 50), 50)
      / 100.0
    )::integer
  );
$$;

create or replace function public.get_pricing_percentage(
  p_setting_key text,
  p_fallback numeric
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(setting_value ->> 'percentage', '')::numeric
      from public.pricing_settings
      where setting_key = p_setting_key
      limit 1
    ),
    p_fallback
  );
$$;

create or replace function public.calculate_booking_pricing(
  p_service_subtotal_cents integer,
  p_taxable_subtotal_cents integer default null,
  p_tip_cents integer default 0,
  p_payment_option text default 'deposit'
)
returns table (
  service_subtotal_cents integer,
  taxable_subtotal_cents integer,
  tax_rate numeric,
  tax_cents integer,
  deposit_percentage numeric,
  deposit_cents integer,
  booking_fee_cents integer,
  tip_cents integer,
  charged_today_cents integer,
  remaining_balance_cents integer,
  grand_total_cents integer
)
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select
      greatest(coalesce(p_service_subtotal_cents, 0), 0) as subtotal,
      least(
        greatest(coalesce(p_taxable_subtotal_cents, p_service_subtotal_cents, 0), 0),
        greatest(coalesce(p_service_subtotal_cents, 0), 0)
      ) as taxable_subtotal,
      greatest(coalesce(p_tip_cents, 0), 0) as tip,
      public.get_pricing_percentage('tax_rate', 0) as configured_tax_rate,
      greatest(public.get_pricing_percentage('deposit', 50), 50) as configured_deposit_percentage
  ),
  amounts as (
    select
      subtotal,
      taxable_subtotal,
      tip,
      configured_tax_rate,
      configured_deposit_percentage,
      round(taxable_subtotal * configured_tax_rate / 100.0)::integer as tax,
      public.calculate_deposit_cents(subtotal, configured_deposit_percentage) as deposit,
      public.calculate_booking_fee_cents(subtotal) as booking_fee
    from settings
  )
  select
    subtotal,
    taxable_subtotal,
    configured_tax_rate,
    tax,
    configured_deposit_percentage,
    deposit,
    booking_fee,
    tip,
    case
      when lower(coalesce(p_payment_option, 'deposit')) = 'full'
        then subtotal + tax + booking_fee + tip
      else deposit + tax + booking_fee + tip
    end,
    case
      when lower(coalesce(p_payment_option, 'deposit')) = 'full' then 0
      else greatest(subtotal - deposit, 0)
    end,
    subtotal + tax + booking_fee + tip
  from amounts;
$$;

create or replace function public.quote_selected_services(
  p_service_ids uuid[],
  p_quantities integer[] default null,
  p_tip_cents integer default 0,
  p_payment_option text default 'deposit'
)
returns table (
  service_subtotal_cents integer,
  taxable_subtotal_cents integer,
  tax_rate numeric,
  tax_cents integer,
  deposit_percentage numeric,
  deposit_cents integer,
  booking_fee_cents integer,
  tip_cents integer,
  charged_today_cents integer,
  remaining_balance_cents integer,
  grand_total_cents integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subtotal integer;
  v_taxable integer;
begin
  if p_service_ids is null or cardinality(p_service_ids) = 0 then
    raise exception 'At least one service is required.';
  end if;

  if p_quantities is not null
     and cardinality(p_quantities) <> cardinality(p_service_ids) then
    raise exception 'Service and quantity arrays must have matching lengths.';
  end if;

  with selected as (
    select
      service_id,
      greatest(coalesce(
        case when p_quantities is null then 1 else p_quantities[ordinality] end,
        1
      ), 1) as quantity
    from unnest(p_service_ids) with ordinality as u(service_id, ordinality)
  ),
  priced as (
    select
      round(s.price * 100)::integer as unit_price_cents,
      selected.quantity,
      s.taxable
    from selected
    join public.services s on s.id = selected.service_id
    where s.active = true
  )
  select
    coalesce(sum(unit_price_cents * quantity), 0),
    coalesce(sum(case when taxable then unit_price_cents * quantity else 0 end), 0)
  into v_subtotal, v_taxable
  from priced;

  if v_subtotal <= 0 then
    raise exception 'No active priced services were found.';
  end if;

  return query
  select *
  from public.calculate_booking_pricing(
    v_subtotal,
    v_taxable,
    p_tip_cents,
    p_payment_option
  );
end;
$$;

create index if not exists idx_appointment_services_service
  on public.appointment_services(service_id);

create index if not exists idx_appointments_payment_status
  on public.appointments(payment_status);

commit;

-- IMPORTANT:
-- Set the correct local combined tax rate after running this migration:
--
-- update public.pricing_settings
-- set setting_value = '{"percentage": 8.25}'::jsonb,
--     updated_at = now()
-- where setting_key = 'tax_rate';
