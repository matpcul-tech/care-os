-- Only the patient or a circle admin may add members or change who has access.
--
-- POST /api/circle enforces the same rule in the service-role route.
-- This trigger covers direct table writes:
--   * a caregiver must not retarget patient_id onto another patient
--   * a caregiver must not raise their own care_role to admin
--   * a caregiver must not rewrite member_email into a different person
-- Nickname, phone, and relationship edits on the caller's own row stay allowed.
-- Service-role writes (auth.uid() is null) are left to the API route.

create or replace function public.care_circle_guard_access()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() = new.patient_id then
    return new;
  end if;

  if public.cc_role(new.patient_id) = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'only the patient or an admin can add circle members';
  end if;

  if new.patient_id is distinct from old.patient_id
     or new.member_user_id is distinct from old.member_user_id
     or new.member_email is distinct from old.member_email
     or new.care_role is distinct from old.care_role
     or new.invite_id is distinct from old.invite_id
     or new.patient_name is distinct from old.patient_name
  then
    raise exception 'only the patient or an admin can change circle access';
  end if;

  return new;
end;
$$;

drop trigger if exists care_circle_guard_access on public.care_circle;
create trigger care_circle_guard_access
  before insert or update on public.care_circle
  for each row
  execute function public.care_circle_guard_access();
