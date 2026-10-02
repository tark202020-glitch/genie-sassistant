-- ============================================================
-- 피드백 랩(/lab) 마이그레이션 — 2026-10-02
-- 실행 위치: Supabase 대시보드 > SQL Editor
-- 근거: 개발 진행문서 v0.1 §2·§3 (JIZAK-plan/workflows/outputs/feedback-test-page/)
-- ============================================================

-- 1) 관리자 구분 (피드백 랩 접근 제어)
alter table app_users add column if not exists is_admin boolean not null default false;
-- 대표 계정만 관리자로 지정 (username 확인 후 실행)
-- update app_users set is_admin = true where username = '<대표_아이디>';

-- 2) 테스트 원고
create table if not exists lab_manuscripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  part_label text,                      -- 예: 1부, 2부
  content text not null,                -- 원고 전문 (쪽 구분자 포함)
  char_count integer not null default 0,
  page_map jsonb,                       -- 쪽 번호 매핑 규칙/인덱스
  created_at timestamptz not null default now()
);

-- 3) 실행 1건
create table if not exists lab_runs (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references lab_manuscripts(id) on delete cascade,
  mode text not null check (mode in ('I','D','R','F')),
  synopsis text,
  versions jsonb not null default '{}'::jsonb,   -- {protocol, rules, prompts, gold}
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  metrics jsonb,                                  -- 지표 6종 계산 결과 (M4)
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 4) 단계별 분할 실행 상태
create table if not exists lab_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references lab_runs(id) on delete cascade,
  step text not null,                   -- '0.5','1','2','3','4','5','6'
  status text not null default 'pending' check (status in ('pending','running','done','failed','skipped')),
  cursor jsonb,                         -- 이어 실행 지점 (멱등)
  output jsonb,                         -- 단계 산출물
  error text,
  updated_at timestamptz not null default now(),
  unique (run_id, step)
);

-- 5) 판정 대상 개별 항목 (프로토콜 v0.2 스키마를 payload에 그대로 보존)
create table if not exists lab_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references lab_runs(id) on delete cascade,
  step text not null,
  item_type text not null check (item_type in ('strength','issue','question','setting')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists lab_items_run_idx on lab_items(run_id);

-- 6) 판정 = 정정 로그
create table if not exists lab_verdicts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references lab_items(id) on delete cascade,
  verdict text not null check (verdict in ('adopted','rejected','disputed')),
  reason text,                          -- 기각(rejected) 시 필수 (앱에서 강제)
  decided_at timestamptz not null default now(),
  unique (item_id)
);

-- 7) 골드 데이터
create table if not exists lab_gold (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references lab_manuscripts(id) on delete cascade,
  item_type text not null check (item_type in ('strength','issue','question','setting','knowledge_state')),
  payload jsonb not null,
  source text not null check (source in ('import','verdict')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists lab_gold_ms_idx on lab_gold(manuscript_id);
