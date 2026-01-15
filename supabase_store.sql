-- Create Products Table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price integer not null,
  image_url text,
  type text check (type in ('digital', 'physical')) default 'digital',
  content_url text, -- For digital goods delivery
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Orders Table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  product_id uuid references public.products not null,
  payment_id text, -- PortOne payment ID
  amount integer not null,
  status text check (status in ('pending', 'paid', 'cancelled', 'failed')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Policies for Products
create policy "Products are viewable by everyone." 
  on public.products for select 
  using (true);

-- Policies for Orders
create policy "Users can view their own orders." 
  on public.orders for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own orders." 
  on public.orders for insert 
  with check (auth.uid() = user_id);
  
-- Initial Data Seeding (Digital Talismans)
insert into public.products (name, description, price, image_url, type, content_url)
values 
('재물운 상승 황금 두꺼비', '재물을 불러오는 황금 두꺼비 디지털 부적입니다. 스마트폰 배경화면으로 사용하세요.', 1000, 'https://images.unsplash.com/photo-1620325493368-24328ce78bf2?q=80&w=300&auto=format&fit=crop', 'digital', 'https://example.com/gold-toad-wallpaper.jpg'),
('연애운 급상승 복숭아꽃', '사랑을 부르는 핑크빛 복숭아꽃 부적입니다. 짝사랑 성공 기원!', 1500, 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=300&auto=format&fit=crop', 'digital', 'https://example.com/peach-blossom.jpg'),
('만사형통 부적', '모든 일이 술술 풀리는 만사형통 부적입니다.', 500, 'https://images.unsplash.com/photo-1628151016008-6e542af1e2a0?q=80&w=300&auto=format&fit=crop', 'digital', 'https://example.com/lucky.jpg');
