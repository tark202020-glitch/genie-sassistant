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
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  filter_assistant_id UUID DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL
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
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
