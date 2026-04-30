-- Security fixes from team review 2026-04-30
-- Apply to live DB AND update 00001 for fresh installs

-- ============================================================
-- 1. Fix all recursive admin policies (use JWT, not profiles subquery)
-- ============================================================
drop policy if exists "Admins can read all profiles" on profiles;
drop policy if exists "Admins see all containers" on containers;
drop policy if exists "Admins can read all entries" on entries;
drop policy if exists "Admins can read all reflections" on reflections;
drop policy if exists "Admins can read all artifacts" on artifacts;
drop policy if exists "Admins can read all invites" on invites;
drop policy if exists "Admins see all subscriptions" on subscriptions;

create policy "Admins can read all profiles" on profiles for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins see all containers" on containers for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins can read all entries" on entries for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins can read all reflections" on reflections for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins can read all artifacts" on artifacts for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins can read all invites" on invites for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create policy "Admins see all subscriptions" on subscriptions for select
  using ((auth.jwt()->'user_metadata'->>'role') = 'admin');

-- ============================================================
-- 2. Fix subscriptions RLS: remove overbroad "for all using(true)"
-- ============================================================
drop policy if exists "Service role can manage subscriptions" on subscriptions;
-- Service role bypasses RLS automatically. No policy needed for it.
-- Coaches can only read their own (existing policy covers this).

-- ============================================================
-- 3. Fix profiles update: prevent role escalation
-- ============================================================
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id)
  with check (role = (select role from profiles where id = auth.uid()));

-- ============================================================
-- 4. Fix profiles insert: restrict to trigger context only
-- ============================================================
drop policy if exists "Service role can insert profiles" on profiles;
-- The handle_new_user trigger runs as SECURITY DEFINER which bypasses RLS.
-- No insert policy needed for normal users.

-- ============================================================
-- 5. Fix invites: remove public read-all, scope to token or coach
-- ============================================================
drop policy if exists "Public can read by token" on invites;
-- Token lookup handled server-side via service client in API routes.
-- Coaches can already read their own container invites via existing policy.

-- ============================================================
-- 6. Fix invites update: scope to the invite being accepted
-- ============================================================
drop policy if exists "Invites can be updated (accepted)" on invites;
-- Invite acceptance handled via service client in API route.

-- ============================================================
-- 7. Fix signup trigger: never trust client-supplied role
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case
      when new.raw_user_meta_data->>'role' = 'client' then 'client'
      else 'coach'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 8. Add UNIQUE constraint on subscriptions.stripe_subscription_id
-- ============================================================
alter table subscriptions add constraint subscriptions_stripe_subscription_id_key
  unique (stripe_subscription_id);

-- ============================================================
-- 9. Add storage bucket for artifact images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('artifact-images', 'artifact-images', true)
on conflict (id) do nothing;
