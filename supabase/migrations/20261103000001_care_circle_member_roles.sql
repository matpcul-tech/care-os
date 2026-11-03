-- Migration: member roles for CareCircle on the shared CareIQ schema.
--
-- Adds care_circle.care_role and care_circle_invites.suggested_role.
-- Idempotent: safe to run more than once.
--
-- NOTE: do NOT apply the older migrations
--   20260504000003_care_circle_patient_name.sql
--   20260507000001_backfill_care_circle_patient_name.sql
--   20260508000001_care_role_scoped_access.sql
-- against the shared CareIQ project. They target a care_circle layout that
-- CareIQ does not use (patient_name) and grandfather every existing member
-- to admin. This file replaces their role columns.

alter table public.care_circle
  add column if not exists care_role text not null default 'caregiver';

alter table public.care_circle_invites
  add column if not exists suggested_role text default 'caregiver';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'care_circle_care_role_check'
      and conrelid = 'public.care_circle'::regclass
  ) then
    alter table public.care_circle
      add constraint care_circle_care_role_check
      check (care_role in ('admin', 'caregiver', 'viewer'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'care_circle_invites_suggested_role_check'
      and conrelid = 'public.care_circle_invites'::regclass
  ) then
    alter table public.care_circle_invites
      add constraint care_circle_invites_suggested_role_check
      check (suggested_role in ('admin', 'caregiver', 'viewer'));
  end if;
end $$;
