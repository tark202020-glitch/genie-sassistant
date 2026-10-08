-- ============================================================
-- 피드백 랩 마이그레이션 03 — RLS 잠금 (2026-10-09)
-- 문제: lab_* 테이블에 RLS가 없어 공개 anon 키만으로 원고 전문을 REST에서 직접 조회 가능
-- 조치: RLS 활성화 + 정책 없음 = anon/authenticated 전면 차단. 서버(service_role)만 접근
--
-- ⚠ 실행 순서 (어기면 랩이 동작을 멈춤):
--   1) Supabase 대시보드 > Settings > API에서 service_role 키 복사
--   2) 로컬 .env.local 과 Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY 추가 (재배포)
--   3) 그 다음에 이 SQL을 실행
-- ============================================================

alter table lab_manuscripts enable row level security;
alter table lab_runs        enable row level security;
alter table lab_run_steps   enable row level security;
alter table lab_items       enable row level security;
alter table lab_verdicts    enable row level security;
alter table lab_gold        enable row level security;

-- 정책을 만들지 않는다 = anon/authenticated 접근 전면 거부 (service_role은 RLS를 우회)
