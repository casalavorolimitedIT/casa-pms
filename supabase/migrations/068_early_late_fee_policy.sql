begin;
-- 068_early_late_fee_policy
-- Add early check-in and late check-out fee columns to property_settings.
-- Both default to 0 (disabled). Staff set them in the property settings page.
-- The front-desk check-in/check-out pages read these values and offer an
-- opt-in prompt when the guest arrives early or departs late.

alter table pms.property_settings
  add column if not exists early_checkin_fee_minor integer not null default 0,
  add column if not exists late_checkout_fee_minor  integer not null default 0;

commit;
