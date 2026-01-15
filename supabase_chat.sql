-- Create Chat Sessions Table
create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text default '새로운 상담',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Chat Messages Table
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Policies for Sessions
create policy "Users can view their own sessions." 
  on public.chat_sessions for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions." 
  on public.chat_sessions for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions." 
  on public.chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions." 
  on public.chat_sessions for delete
  using (auth.uid() = user_id);

-- Policies for Messages
create policy "Users can view messages of their sessions." 
  on public.chat_messages for select 
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their sessions." 
  on public.chat_messages for insert 
  with check (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );
