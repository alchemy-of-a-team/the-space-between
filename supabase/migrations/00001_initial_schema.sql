-- The Space Between: Initial Schema
-- Seven tables: profiles, containers, entries, reflections, artifacts, invites, subscriptions

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'coach', 'client')),
  created_at timestamptz default now()
);

-- containers (the engagement)
create table containers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  client_id uuid references profiles(id),
  title text,
  compound_question text not null default 'What do you want to do all day, and what will it take to have that life?',
  status text not null default 'invited' check (status in ('invited', 'active', 'closing', 'closed')),
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '3 months'),
  created_at timestamptz default now()
);

-- entries (the shared space, visible to both parties)
create table entries (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- reflections (private coach-side, not visible to client)
create table reflections (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  coach_id uuid not null references profiles(id),
  what_shifted text,
  what_unnamed text,
  compound_question_now text,
  created_at timestamptz default now()
);

-- artifacts (emergence artifact)
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  generated_by uuid not null references profiles(id),
  medium text,
  symbolic_language text,
  coach_synthesis text,
  content jsonb not null,
  narrative text not null,
  generated_at timestamptz default now()
);

-- invites (client onboarding)
create table invites (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  email text not null,
  token text not null unique default gen_random_uuid()::text,
  accepted boolean default false,
  created_at timestamptz default now()
);

-- subscriptions (Stripe integration)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  status text not null check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end timestamptz not null,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table containers enable row level security;
alter table entries enable row level security;
alter table reflections enable row level security;
alter table artifacts enable row level security;
alter table invites enable row level security;
alter table subscriptions enable row level security;

-- PROFILES RLS
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Service role can insert profiles"
  on profiles for insert with check (true);

-- CONTAINERS RLS
create policy "Coaches see own containers"
  on containers for select using (coach_id = auth.uid());

create policy "Clients see containers they belong to"
  on containers for select using (client_id = auth.uid());

create policy "Admins see all containers"
  on containers for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Coaches can create containers"
  on containers for insert with check (coach_id = auth.uid());

create policy "Coaches can update own containers"
  on containers for update using (coach_id = auth.uid());

-- ENTRIES RLS
create policy "Container parties can read entries"
  on entries for select using (
    exists (
      select 1 from containers
      where containers.id = entries.container_id
      and (containers.coach_id = auth.uid() or containers.client_id = auth.uid())
    )
  );

create policy "Admins can read all entries"
  on entries for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Container parties can create entries"
  on entries for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from containers
      where containers.id = entries.container_id
      and (containers.coach_id = auth.uid() or containers.client_id = auth.uid())
    )
  );

-- REFLECTIONS RLS (coach only, client cannot see)
create policy "Coaches can read own reflections"
  on reflections for select using (coach_id = auth.uid());

create policy "Admins can read all reflections"
  on reflections for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Coaches can create reflections"
  on reflections for insert with check (
    coach_id = auth.uid()
    and exists (
      select 1 from containers
      where containers.id = reflections.container_id
      and containers.coach_id = auth.uid()
    )
  );

-- ARTIFACTS RLS
create policy "Container parties can read artifacts"
  on artifacts for select using (
    exists (
      select 1 from containers
      where containers.id = artifacts.container_id
      and (containers.coach_id = auth.uid() or containers.client_id = auth.uid())
    )
  );

create policy "Admins can read all artifacts"
  on artifacts for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Container parties can create artifacts"
  on artifacts for insert with check (
    generated_by = auth.uid()
    and exists (
      select 1 from containers
      where containers.id = artifacts.container_id
      and (containers.coach_id = auth.uid() or containers.client_id = auth.uid())
    )
  );

-- INVITES RLS
create policy "Coaches see invites for own containers"
  on invites for select using (
    exists (
      select 1 from containers
      where containers.id = invites.container_id
      and containers.coach_id = auth.uid()
    )
  );

create policy "Public can read by token"
  on invites for select using (true);

create policy "Admins can read all invites"
  on invites for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Coaches can create invites"
  on invites for insert with check (
    exists (
      select 1 from containers
      where containers.id = invites.container_id
      and containers.coach_id = auth.uid()
    )
  );

create policy "Invites can be updated (accepted)"
  on invites for update using (true);

-- SUBSCRIPTIONS RLS
create policy "Coaches see own subscription"
  on subscriptions for select using (coach_id = auth.uid());

create policy "Admins see all subscriptions"
  on subscriptions for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Service role can manage subscriptions"
  on subscriptions for all using (true);

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'coach')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
