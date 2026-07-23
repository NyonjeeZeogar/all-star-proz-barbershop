begin;

alter table public.appointments
  add column if not exists square_payment_link_id text,
  add column if not exists square_merchant_id text,
  add column if not exists square_connection_id uuid,
  add column if not exists payment_type text,
  add column if not exists payment_amount_cents integer,
  add column if not exists payment_currency text default 'USD',
  add column if not exists payment_started_at timestamptz,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_failed_at timestamptz,
  add column if not exists payment_failure_reason text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_amount_cents integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_payment_type_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_payment_type_check
      check (
        payment_type is null
        or payment_type in ('deposit', 'full')
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_payment_amount_cents_nonnegative'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_payment_amount_cents_nonnegative
      check (
        payment_amount_cents is null
        or payment_amount_cents >= 0
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_refunded_amount_cents_nonnegative'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_refunded_amount_cents_nonnegative
      check (
        refunded_amount_cents is null
        or refunded_amount_cents >= 0
      );
  end if;
end;
$$;

create index if not exists appointments_square_order_id_idx
  on public.appointments (square_order_id)
  where square_order_id is not null;

create index if not exists appointments_square_payment_id_idx
  on public.appointments (square_payment_id)
  where square_payment_id is not null;

create index if not exists appointments_square_payment_link_id_idx
  on public.appointments (square_payment_link_id)
  where square_payment_link_id is not null;

create index if not exists appointments_payment_status_idx
  on public.appointments (payment_status);

commit;
