-- Tarot Readings Table
create table if not exists public.tarot_readings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  spread_type text not null, -- 'daily', 'love', 'career', 'celtic'
  question text,
  selected_cards jsonb not null, -- Array of cards
  reading_result jsonb not null, -- The AI response
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.tarot_readings enable row level security;

create policy "Users can view their own readings"
  on public.tarot_readings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own readings"
  on public.tarot_readings for insert
  with check (auth.uid() = user_id);
