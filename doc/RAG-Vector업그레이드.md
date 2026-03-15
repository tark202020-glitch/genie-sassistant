# Vector RAG 업그레이드 및 지식 그래프 시각화

Google Vertex AI Search(Discovery Engine) 기반 관리형 RAG를 **Supabase pgvector 기반 Vector RAG**로 전환하고, 이를 활용하여 **문서 간 관계 시각화(Knowledge Graph)**를 구현합니다.

---

## 📊 현재 상태 vs 전환 후 상태 비교

| 항목 | 🔴 현재 (Before) | 🟢 전환 후 (After) |
|------|------------------|---------------------|
| **문서 저장소** | Google Cloud Storage (GCS) | GCS 유지 (원본 보관용) |
| **인덱싱/검색 엔진** | Google Vertex AI Search (Discovery Engine) | Supabase pgvector (자체 벡터 DB) |
| **임베딩 처리** | Google 내부 자동 처리 (블랙박스) | Google `text-embedding-004` 직접 호출 |
| **텍스트 청킹** | Discovery Engine 자동 처리 | LangChain `RecursiveCharacterTextSplitter` 직접 처리 |
| **검색 방식** | `SearchServiceClient.search()` API 호출 | Supabase `rpc('match_documents')` 코사인 유사도 검색 |
| **벡터 관리** | 불가 (Google 관리형) | 직접 관리 (CRUD, 유사도 계산 가능) |
| **문서 간 관계** | ❌ 불가 | ✅ 벡터 유사도 기반 자동 계산 |
| **시각화** | ❌ 불가 | ✅ D3.js 네트워크 그래프 |
| **비용** | Discovery Engine 검색 비용 | 임베딩 API 호출 비용만 (Supabase 무료 DB) |
| **레벨 1 (공유 지식)** | GCS `database/` → Discovery Engine | GCS `database/` → pgvector `documents` 테이블 |
| **레벨 2 (전문 지식)** | GCS `assistants/{id}/` → Discovery Engine | GCS `assistants/{id}/` → pgvector `documents` 테이블 (assistant_id 컬럼으로 분리) |

---

## 🏗️ 전환 아키텍처

### 현재 아키텍처
```
파일 업로드 → GCS 저장 → Discovery Engine importDocuments()
질문 → SearchServiceClient.search() → 검색 결과 → Gemini 프롬프트에 삽입 → 답변
```

### 전환 후 아키텍처
```
파일 업로드 → GCS 저장 → 텍스트 추출 → 청킹 → 임베딩(text-embedding-004) → pgvector 저장
질문 → 임베딩 → pgvector 코사인 유사도 검색 → 관련 청크 → Gemini 프롬프트에 삽입 → 답변
                                                    ↓
                                        문서 간 유사도 계산 → 그래프 시각화
```

---

## Phase 1: Vector RAG 전환

### 1. Supabase 데이터베이스 설정

Supabase SQL Editor에서 실행할 마이그레이션:

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 청크 테이블
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,                    -- 청크 텍스트
  metadata JSONB DEFAULT '{}',             -- 파일명, 페이지, 유형 등
  embedding VECTOR(768),                   -- text-embedding-004 차원
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,  -- NULL이면 레벨1
  doc_type TEXT DEFAULT 'script',          -- 'script' | 'reference'
  source_file TEXT,                        -- 원본 파일명
  gcs_uri TEXT,                            -- GCS 경로
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 유사도 검색 인덱스 (IVFFlat)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 유사도 검색 RPC 함수
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
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.source_file,
    d.doc_type,
    d.assistant_id
  FROM documents d
  WHERE
    (filter_assistant_id IS NULL OR d.assistant_id = filter_assistant_id OR d.assistant_id IS NULL)
    AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

> [!IMPORTANT]
> 이 SQL은 Supabase 대시보드의 SQL Editor에서 수동으로 실행해야 합니다.

---

### 2. 임베딩 유틸리티 모듈

#### [NEW] [embeddings.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/lib/embeddings.ts)

Google `text-embedding-004` 모델을 사용한 임베딩 생성 모듈:
- `generateEmbedding(text)` — 단일 텍스트 임베딩
- `generateEmbeddings(texts)` — 배치 임베딩
- `splitTextIntoChunks(text)` — LangChain `RecursiveCharacterTextSplitter`로 텍스트를 800자 청크로 분할

---

### 3. Ingest API 전환

#### [MODIFY] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/ingest/route.ts)

**변경 내용:**
- Discovery Engine `importDocuments()` 제거
- 파일 → 텍스트 추출 (PDF: `pdf-parse`, TXT: 직접 읽기)
- 텍스트 → 청킹 → 임베딩 → Supabase `documents` 테이블에 저장
- GCS 업로드는 원본 보관용으로 유지

#### [MODIFY] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/assistants/[id]/ingest/route.ts)

**변경 내용:**
- 레벨1과 동일한 파이프라인, `assistant_id` 컬럼에 보조작가 ID 추가
- `doc_type` ('script' | 'reference') 구분 유지

---

### 4. Chat API 전환

#### [MODIFY] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/chat/route.ts)

**변경 내용:**
- `SearchServiceClient` → Supabase `match_documents` RPC 호출
- 질문 텍스트를 임베딩 → `match_documents(embedding, threshold, count, assistant_id, doc_type)` 호출
- 레벨1(공유) + 레벨2(보조작가 전용) 통합 검색 로직 유지
- `doc_type` 필터링 유지 (analyze_script → 'script', analyze_reference → 'reference')

---

### 5. Documents API 전환

#### [MODIFY] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/documents/route.ts)

**변경 내용:**
- Discovery Engine `listDocuments/deleteDocument` → Supabase `documents` 테이블 쿼리
- 문서 목록: `SELECT DISTINCT source_file, ...` 그룹화
- 문서 삭제: 해당 `source_file`의 모든 청크 삭제

#### [MODIFY] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/assistants/[id]/documents/route.ts)

**변경 내용:**
- 동일 패턴으로 전환, `assistant_id` 필터 추가

---

### 6. 의존성 변경

#### [MODIFY] [package.json](file:///g:/Antigravity_Google/Genie_Assistant/package.json)

```diff
- "@google-cloud/discoveryengine": "^2.5.3",
+ (제거 — 더 이상 사용하지 않음)
```

> [!NOTE]
> `@google-cloud/storage`는 GCS 원본 보관용으로 유지합니다.
> `@langchain/textsplitters`는 이미 설치되어 있으므로 그대로 활용합니다.

---

## Phase 2: 지식 그래프 시각화

### 1. 유사도 계산 API

#### [NEW] [route.ts](file:///g:/Antigravity_Google/Genie_Assistant/src/app/api/knowledge-graph/route.ts)

- 전체 문서의 대표 임베딩(평균 벡터) 조회
- 문서 간 코사인 유사도 계산
- 보조작가 ↔ 문서 관계 데이터 포함
- 그래프 노드(문서, 보조작가) + 엣지(유사도) JSON 반환

### 2. 시각화 페이지

#### [NEW] [page.tsx](file:///g:/Antigravity_Google/Genie_Assistant/src/app/knowledge-graph/page.tsx)

- D3.js `force-directed graph`로 네트워크 시각화
- 보조작가 노드 (큰 원), 문서 노드 (작은 원), 유사도 연결선
- 줌/팬, 노드 드래그, 호버 상세정보
- 유사도 임계값 슬라이더 (연결선 필터링)

---

## 검증 계획

### 자동 테스트
- `npm run build` — 빌드 성공 확인

### 수동 테스트 (사용자 확인 필요)

1. **Supabase SQL 실행 확인**
   - Supabase 대시보드 → SQL Editor → 마이그레이션 실행
   - `documents` 테이블과 `match_documents` 함수 생성 확인

2. **레벨1 문서 업로드 테스트**
   - 웹 UI에서 파일 업로드 → 콘솔에서 청킹/임베딩 로그 확인
   - Supabase `documents` 테이블에 데이터 저장 확인

3. **레벨2 문서 업로드 테스트**
   - 보조작가 선택 → 파일 업로드 → `assistant_id` 컬럼에 값 확인

4. **채팅 검색 테스트**
   - 업로드한 문서 관련 질문 → 관련 컨텍스트가 포함된 답변 확인
   - 콘솔에서 `[RAG]` 로그로 유사도 점수 확인

5. **시각화 테스트**
   - `/knowledge-graph` 페이지 접속 → 네트워크 그래프 렌더링 확인
   - 노드 드래그, 줌, 유사도 필터 동작 확인
