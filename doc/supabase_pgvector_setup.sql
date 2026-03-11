-- 1. pgvector 확장 활성화 (벡터 데이터 처리용)
create extension if not exists vector;

-- 2. 대본/참고문서 Chunk 및 메타데이터를 저장할 테이블 생성
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  -- Google Gemini 텍스트 임베딩 모델(text-embedding-004 등)의 차원 수인 768 설정
  embedding vector(768) 
);

-- 3. 벡터 쿼리 성능 향상을 위한 인덱스 생성 (선택 사항이나 권장됨)
-- HNSW (Hierarchical Navigable Small World) 인덱스 사용
create index on documents using hnsw (embedding vector_cosine_ops);

-- 4. 유사도 검색(Similarity Search)을 위한 Postgres 매칭 함수 
create or replace function match_documents (
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity -- 코사인 유사도 연산
  from documents
  -- 메타데이터 필터링 조건 추가 (예: 특정 작가의 대본만 검색 등)
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
