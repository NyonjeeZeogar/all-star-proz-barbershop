begin;

insert into public.pricing_settings (
  setting_key,
  setting_value,
  description
)
values (
  'tax_rate',
  '{"percentage": 8.25}'::jsonb,
  'Combined sales-tax percentage for the shop location.'
)
on conflict (setting_key)
do update set
  setting_value = excluded.setting_value,
  description = excluded.description,
  updated_at = now();

commit;