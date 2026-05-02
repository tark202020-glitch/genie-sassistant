-- ============================================
-- Vector RAG 업그레이드 - Supabase Migration
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ⚠️ 기존 documents 테이블 삭제 (이전 버전에서 3072차원으로 생성되어 있음)
DROP TABLE IF EXISTS documents CASCADE;

-- 2. 문서 청크 테이블
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  doc_type TEXT DEFAULT 'script',
  source_file TEXT,
  gcs_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 벡터 유사도 검색 인덱스 (HNSW — 빈 테이블에서도 생성 가능, IVFFlat보다 정확도 높음)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

-- 4. source_file 인덱스 (문서 목록/삭제 최적화)
CREATE INDEX IF NOT EXISTS documents_source_file_idx ON documents (source_file);
CREATE INDEX IF NOT EXISTS documents_assistant_id_idx ON documents (assistant_id);

-- 5. 유사도 검색 RPC 함수
-- ★ v2: filter_source_file 파라미터 추가 (파일 지정 검색 지원)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  filter_assistant_id UUID DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL,
  filter_source_file TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  source_file TEXT,
  doc_type TEXT,
  assistant_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity,
    d.source_file,
    d.doc_type,
    d.assistant_id
  FROM documents d
  WHERE
    CASE
      WHEN filter_assistant_id IS NULL THEN d.assistant_id IS NULL
      ELSE d.assistant_id = filter_assistant_id
    END
    AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
    AND (filter_source_file IS NULL OR d.source_file = filter_source_file)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. 문서 요약 테이블 (파일 업로드 시 자동 생성)
CREATE TABLE IF NOT EXISTS document_summaries (
  id BIGSERIAL PRIMARY KEY,
  source_file TEXT NOT NULL,
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  doc_type TEXT DEFAULT 'script',
  gcs_uri TEXT,
  char_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- assistant_id가 NULL인 경우를 위한 고유 인덱스 (공유 자료)
CREATE UNIQUE INDEX IF NOT EXISTS document_summaries_source_file_null_assistant
  ON document_summaries (source_file) WHERE assistant_id IS NULL;

-- assistant_id가 있는 경우의 고유 인덱스 (보조작가 전용)
CREATE UNIQUE INDEX IF NOT EXISTS document_summaries_source_file_assistant
  ON document_summaries (source_file, assistant_id) WHERE assistant_id IS NOT NULL;

-- ============================================
-- ★ 기존 DB 업데이트 시 아래 SQL만 실행하세요
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================
-- 1) match_documents RPC 업데이트:
-- DROP FUNCTION IF EXISTS match_documents;
-- 위의 CREATE OR REPLACE FUNCTION match_documents(...) 전체를 실행
--
-- 2) document_summaries 테이블 생성:
-- 위의 CREATE TABLE IF NOT EXISTS document_summaries(...) 및 인덱스 전체를 실행
--
-- 3) assistants 테이블에 response_style 컬럼 추가:
-- ALTER TABLE assistants ADD COLUMN IF NOT EXISTS response_style TEXT;
--
-- 4) script_analyses 테이블 생성 (대본 정리 분석 캐시):
-- CREATE TABLE IF NOT EXISTS script_analyses (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
--   name TEXT NOT NULL,
--   analysis_type TEXT NOT NULL,  -- 'settings' | 'episodes'
--   data JSONB NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS script_analyses_assistant_id_idx ON script_analyses(assistant_id);
--
-- 5) script_analyses RLS 정책 (anon 역할 허용 — 필수!):
-- ALTER TABLE script_analyses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for anon" ON script_analyses FOR ALL USING (true) WITH CHECK (true);
