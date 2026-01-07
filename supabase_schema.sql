-- Create Posts Table
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  user_id uuid references auth.users not null,
  author_name text,
  tag text,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Comments Table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references auth.users not null,
  content text not null,
  author_name text,
  parent_id uuid references public.comments, -- Nullable for top-level comments
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- Policies for Posts
create policy "Public posts are viewable by everyone." 
  on public.posts for select 
  using (true);

create policy "Authenticated users can insert posts." 
  on public.posts for insert 
  with check (auth.uid() = user_id);

-- Policies for Comments
create policy "Public comments are viewable by everyone." 
  on public.comments for select 
  using (true);

create policy "Authenticated users can insert comments." 
  on public.comments for insert 
  with check (auth.uid() = user_id);
