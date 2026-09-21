-- ============================================================
--  숙소 예약 앱 — Supabase 스키마 (멱등성: 여러 번 실행 가능)
--  실행: Supabase 대시보드 → SQL Editor → 이 파일 전체 실행
-- ============================================================

-- 1) 예약
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null,                          -- 예약코드 (PB-XXXX, 참고용)
  guest_name text not null,
  phone text not null,
  check_in date not null,
  check_out date not null,
  nights int not null,
  guests int not null,
  per_person_price int not null,               -- 예약 시점 1인당 요금
  total_amount int not null,
  depositor text not null default '',          -- 입금자명
  message text not null default '',
  status text not null default 'pending',      -- pending|confirmed|cancelled|completed
  refund_status text not null default 'none',  -- none|pending|done (취소 시 환불 관리)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reservations_check_in on reservations (check_in);
create index if not exists idx_reservations_status on reservations (status);

-- 2) 설정 (단일 row, id=1)
create table if not exists settings (
  id int primary key default 1,
  pension_name text not null default '우리 펜션',
  tagline text not null default '',
  description text not null default '',
  per_person_price int not null default 30000 check (per_person_price between 10000 and 50000),
  max_guests int not null default 12,
  bank_name text not null default '',
  account_number text not null default '',
  account_holder text not null default '',
  contact_phone text not null default '',
  check_in_time text not null default '15:00',
  check_out_time text not null default '11:00',
  auto_close_overbook boolean not null default false,
  address text not null default '',
  map_link text not null default '',
  parking_info text not null default '',
  arrival_info text not null default '',
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- 3) 갤러리 사진
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 4) 관리자 푸시 구독 (웹푸시 endpoint)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 5) 휴무일 (예약 불가 날짜)
create table if not exists blocked_dates (
  date date primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- 6) 손님 후기 (투숙완료 예약에 한해 등록)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null,
  guest_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_code on reviews (reservation_code);

-- 7) 사진 업로드용 공개 Storage 버킷 (S3 방식)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ── 기존 설치본 업그레이드 (컬럼 추가 — 이미 있으면 무시) ──
alter table reservations add column if not exists refund_status text not null default 'none';
alter table settings add column if not exists auto_close_overbook boolean not null default false;
alter table settings add column if not exists address text not null default '';
alter table settings add column if not exists map_link text not null default '';
alter table settings add column if not exists parking_info text not null default '';
alter table settings add column if not exists arrival_info text not null default '';

-- ============================================================
--  보안 모델
--  이 앱은 모든 DB 접근을 서버(API route)에서 service role 키로 수행하므로
--  RLS를 켜고 정책 없이 두면 클라이언트(anon key) 직접 접근은 차단됩니다.
-- ============================================================
alter table reservations enable row level security;
alter table settings enable row level security;
alter table photos enable row level security;
alter table push_subscriptions enable row level security;
alter table blocked_dates enable row level security;
alter table reviews enable row level security;
