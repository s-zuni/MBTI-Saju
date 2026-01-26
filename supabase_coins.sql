-- ============================================
-- 코인(크레딧) 시스템 DB 스키마
-- ============================================

-- 1. profiles 테이블에 coins 컬럼 추가
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'coins') then
        alter table public.profiles add column coins integer default 0;
    end if;
end $$;

-- 2. 코인 패키지 테이블
create table if not exists public.coin_packages (
  id text primary key,
  coins integer not null,
  original_price integer not null,
  price integer not null,
  is_discount boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 코인 거래 내역 테이블
create table if not exists public.coin_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount integer not null, -- 양수: 충전, 음수: 사용
  type text check (type in ('purchase', 'usage', 'reward', 'migration')) not null,
  service_type text, -- 사용 서비스명 (fortune_tomorrow, mbti_saju, tarot 등)
  payment_id text, -- PortOne 결제 ID (구매시)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS 활성화
alter table public.coin_packages enable row level security;
alter table public.coin_transactions enable row level security;

-- 5. Policies
-- coin_packages: 모든 사용자 읽기 가능
create policy "Coin packages are viewable by everyone." 
  on public.coin_packages for select 
  using (true);

-- coin_transactions: 본인 기록만 조회/삽입
create policy "Users can view their own transactions." 
  on public.coin_transactions for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions." 
  on public.coin_transactions for insert 
  with check (auth.uid() = user_id);

-- 6. 코인 패키지 초기 데이터 (UPSERT)
insert into public.coin_packages (id, coins, original_price, price, is_discount)
values 
  ('coin_100', 100, 29000, 9900, true),
  ('coin_50', 50, 13900, 5900, true),
  ('coin_10', 10, 3900, 2900, true)
on conflict (id) do update set
  coins = excluded.coins,
  original_price = excluded.original_price,
  price = excluded.price,
  is_discount = excluded.is_discount;

-- 7. 기존 구독자 마이그레이션 (basic → 30코인, deep → 100코인)
update public.profiles
set coins = case 
    when tier = 'basic' then 30
    when tier = 'deep' then 100
    else coins
  end,
  tier = 'free'
where tier in ('basic', 'deep');

-- 마이그레이션 기록 생성 (basic 사용자)
insert into public.coin_transactions (user_id, amount, type, service_type)
select id, 30, 'migration', 'basic_tier_migration'
from public.profiles
where tier = 'basic';

-- 마이그레이션 기록 생성 (deep 사용자)
insert into public.coin_transactions (user_id, amount, type, service_type)
select id, 100, 'migration', 'deep_tier_migration'
from public.profiles
where tier = 'deep';
