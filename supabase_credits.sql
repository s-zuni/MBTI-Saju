-- ============================================
-- 크레딧 시스템 DB 스키마 (FIFO + 환불 지원)
-- ============================================

-- 1. 요금제(크레딧 패키지) 테이블
create table if not exists public.pricing_plans (
  id text primary key,
  name text not null,
  credits integer not null,
  price integer not null,
  original_price integer not null,
  description text,
  is_popular boolean default false,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 크레딧 구매건 테이블 (FIFO의 핵심)
create table if not exists public.credit_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plan_id text references public.pricing_plans,
  purchased_credits integer not null,
  remaining_credits integer not null,
  price_paid integer not null default 0,
  payment_id text,
  status text check (status in ('active', 'pending_refund', 'refunded')) default 'active',
  purchased_at timestamp with time zone default timezone('utc'::text, now()) not null,
  refund_requested_at timestamp with time zone
);

-- 3. 크레딧 사용 기록 테이블
create table if not exists public.credit_usages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  purchase_id uuid references public.credit_purchases not null,
  credits_used integer not null,
  service_type text not null,
  used_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS 활성화
alter table public.pricing_plans enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.credit_usages enable row level security;

-- 5. Policies

-- pricing_plans: 모든 사용자 읽기 가능
drop policy if exists "Pricing plans are viewable by everyone." on public.pricing_plans;
create policy "Pricing plans are viewable by everyone."
  on public.pricing_plans for select
  using (true);

-- credit_purchases: 본인 기록만 조회/삽입
drop policy if exists "Users can view their own purchases." on public.credit_purchases;
create policy "Users can view their own purchases."
  on public.credit_purchases for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own purchases." on public.credit_purchases;
create policy "Users can insert their own purchases."
  on public.credit_purchases for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own purchases." on public.credit_purchases;
create policy "Users can update their own purchases."
  on public.credit_purchases for update
  using (auth.uid() = user_id);

-- credit_usages: 본인 기록만 조회/삽입
drop policy if exists "Users can view their own usages." on public.credit_usages;
create policy "Users can view their own usages."
  on public.credit_usages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own usages." on public.credit_usages;
create policy "Users can insert their own usages."
  on public.credit_usages for insert
  with check (auth.uid() = user_id);

-- 6. 요금제 초기 데이터
insert into public.pricing_plans (id, name, credits, price, original_price, description, is_popular, sort_order)
values
  ('plan_100', '프리미엄 100', 100, 9900, 29000, '가장 가성비 좋은 패키지', true, 1),
  ('plan_50', '스탠다드 50', 50, 5900, 13900, '가볍게 시작하기 좋은 패키지', false, 2),
  ('plan_10', '스타터 10', 10, 2900, 3900, '체험용 소량 패키지', false, 3)
on conflict (id) do update set
  name = excluded.name,
  credits = excluded.credits,
  price = excluded.price,
  original_price = excluded.original_price,
  description = excluded.description,
  is_popular = excluded.is_popular,
  sort_order = excluded.sort_order;

-- 7. 기존 데이터 마이그레이션 (profiles.coins → credit_purchases)
-- 기존 코인이 있는 사용자를 위한 마이그레이션
-- 주의: 이 스크립트는 한 번만 실행하세요
/*
insert into public.credit_purchases (user_id, plan_id, purchased_credits, remaining_credits, price_paid, payment_id, status)
select
  id,
  'migration',
  coins,
  coins,
  0,
  'migrated_from_coins',
  'active'
from public.profiles
where coins > 0;
*/
