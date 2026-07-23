begin;

create table if not exists public.square_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  event_type text,
  merchant_id text,
  location_id text,
  entity_id text,
  processing_status text default 'received',
  payload jsonb,
  error_message text,
  received_at timestamptz default now(),
  processed_at timestamptz
);

-- Repair a table that may already exist with missing columns.
alter table public.square_webhook_events
  add column if not exists event_id text,
  add column if not exists event_type text,
  add column if not exists merchant_id text,
  add column if not exists location_id text,
  add column if not exists entity_id text,
  add column if not exists processing_status text default 'received',
  add column if not exists payload jsonb,
  add column if not exists error_message text,
  add column if not exists received_at timestamptz default now(),
  add column if not exists processed_at timestamptz;

-- If an older table used "status", copy its values into
-- "processing_status" where possible.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'square_webhook_events'
      and column_name = 'status'
  ) then
    execute $sql$
      update public.square_webhook_events
      set processing_status =
        case
          when status in (
            'received',
            'processing',
            'processed',
            'ignored',
            'failed'
          )
          then status
          else 'received'
        end
      where processing_status is null
    $sql$;
  end if;
end;
$$;

update public.square_webhook_events
set processing_status = 'received'
where processing_status is null;

update public.square_webhook_events
set received_at = now()
where received_at is null;

update public.square_webhook_events
set payload = '{}'::jsonb
where payload is null;

alter table public.square_webhook_events
  alter column event_id set not null,
  alter column event_type set not null,
  alter column processing_status set default 'received',
  alter column processing_status set not null,
  alter column payload set not null,
  alter column received_at set default now(),
  alter column received_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'square_webhook_events_processing_status_check'
      and conrelid = 'public.square_webhook_events'::regclass
  ) then
    alter table public.square_webhook_events
      add constraint square_webhook_events_processing_status_check
      check (
        processing_status in (
          'received',
          'processing',
          'processed',
          'ignored',
          'failed'
        )
      );
  end if;
end;
$$;

create unique index if not exists square_webhook_events_event_id_key
  on public.square_webhook_events (event_id);

create index if not exists square_webhook_events_event_type_idx
  on public.square_webhook_events (event_type);

create index if not exists square_webhook_events_processing_status_idx
  on public.square_webhook_events (processing_status);

create index if not exists square_webhook_events_merchant_id_idx
  on public.square_webhook_events (merchant_id)
  where merchant_id is not null;

create index if not exists square_webhook_events_received_at_idx
  on public.square_webhook_events (received_at desc);

alter table public.square_webhook_events enable row level security;

revoke all on table public.square_webhook_events from anon;
revoke all on table public.square_webhook_events from authenticated;

commit;
