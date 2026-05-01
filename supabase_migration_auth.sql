-- ============================================
-- Genie Assistant 로그인 시스템 테이블 생성
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 세션 테이블
CREATE TABLE IF NOT EXISTS app_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. conversations 테이블에 user_id 컬럼 추가
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON app_sessions(token);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);

-- 5. RLS 정책 (anon key로 접근 허용)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on app_users') THEN
    CREATE POLICY "Allow all on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on app_sessions') THEN
    CREATE POLICY "Allow all on app_sessions" ON app_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. 만료된 세션 자동 정리 (선택사항: pg_cron 사용 시)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 */6 * * *', $$DELETE FROM app_sessions WHERE expires_at < now()$$);
