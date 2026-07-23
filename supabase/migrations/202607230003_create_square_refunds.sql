create table if not exists public.square_refunds (
  id uuid primary key default gen_random_uuid(),
  square_refund_id text not null unique,
  square_payment_id text not null,
  appointment_id uuid not null
    references public.appointments(id) on delete cascade,
  amount_cents integer not null
    check (amount_cents > 0),
  currency text not null default 'USD',
  status text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists square_refunds_appointment_id_idx
  on public.square_refunds (appointment_id);

create index if not exists square_refunds_square_payment_id_idx
  on public.square_refunds (square_payment_id);

alter table public.square_refunds enable row level security;

revoke all on public.square_refunds from anon;
revoke all on public.square_refunds from authenticated;
