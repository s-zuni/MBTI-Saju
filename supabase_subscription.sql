-- 1. Create Profiles Table if it doesn't exist (Standard Supabase Pattern)
-- Note: We use 'id' as the foreign key to auth.users, which is a common pattern.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add Subscription Columns safely
-- This block checks if columns exist before adding them to avoid errors if the table already existed.
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'tier') then
        alter table public.profiles add column tier text check (tier in ('free', 'basic', 'deep')) default 'free';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'expiry_date') then
        alter table public.profiles add column expiry_date timestamp with time zone;
    end if;
end $$;

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Policies (Drop first to avoid conflicts if they exist with wrong logic)
drop policy if exists "Users can view their own profile." on public.profiles;
create policy "Users can view their own profile." 
  on public.profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile." 
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Trigger for new users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  -- Standard pattern: id matches new.id
  insert into public.profiles (id, tier)
  values (new.id, 'free')
  on conflict (id) do nothing; -- Handle case where profile might already exist
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger safely
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
