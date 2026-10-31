-- MY ASSETS · Supabase schema
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 한 번 실행하세요.
-- 모든 테이블은 로그인한 본인(auth.uid())의 행만 읽고 쓸 수 있습니다 (RLS).

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'bank',          -- bank | cash | savings | securities | loan
  institution text,
  balance numeric not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  issuer text,
  pay_day int not null check (pay_day between 1 and 31),
  pay_account_id uuid references accounts(id) on delete set null,
  credit_limit numeric,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  kind text not null,                          -- income | expense | card_payment | transfer
  category text,
  amount numeric not null check (amount >= 0),
  account_id uuid references accounts(id) on delete set null,
  card_id uuid references cards(id) on delete set null,
  settled boolean not null default false,      -- 카드 사용분이 결제 처리되었는지
  memo text,
  source text not null default 'manual',       -- manual | import
  created_at timestamptz not null default now()
);

create table if not exists recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null,                          -- income | expense
  category text,
  amount numeric not null check (amount >= 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  account_id uuid references accounts(id) on delete set null,
  card_id uuid references cards(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  ticker text,
  kind text not null default '주식',            -- 주식 | ETF | 채권 | 코인 | 펀드 | 부동산 | 기타
  qty numeric not null default 0,
  avg_price numeric not null default 0,
  current_price numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  net_worth numeric not null,
  cash numeric, invest numeric, debt numeric,
  unique (user_id, date)
);

do $rls$
declare t text;
begin
  foreach t in array array['accounts','cards','transactions','recurring','investments','snapshots'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format('create policy own_rows on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $rls$;

create index if not exists tx_user_date on transactions (user_id, date desc);
