import { createClient } from '@supabase/supabase-js';

// 피드백 랩 서버 전용 Supabase 클라이언트.
// RLS 적용(마이그레이션 03) 후에는 service_role 키가 필수다 — anon 키는 lab_* 테이블 접근이 거부된다.
// service_role 키는 서버에서만 사용하며 절대 NEXT_PUBLIC_ 접두사를 붙이지 않는다.
export const labDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
