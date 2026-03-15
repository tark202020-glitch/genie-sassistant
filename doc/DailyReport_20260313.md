# Daily Report - 2026-03-13 (수)

## 📋 작업 요약
Genie Assistant(AI 보조작가 시스템)의 **RAG 아키텍처 전반 시스템 점검** 및 핵심 오류 수정

---

## ✅ 완료된 작업

### 1. RAG 파이프라인 4대 핵심 이슈 수정
| # | 수정 내용 | 파일 |
|--|----------|------|
| 1 | 임베딩 모델 교체 (`text-embedding-004` 종료 → `gemini-embedding-001`) | `ingest/route.ts`, `chat/route.ts` |
| 2 | Edge Runtime 제거 (LangChain Node.js 비호환) | `chat/route.ts` |
| 3 | 배치 임베딩 구현 (순차 222번 호출 → 50건 단위 배치) | `ingest/route.ts` |
| 4 | 멀티턴 대화 포맷 개선 (`startChat()` + `systemInstruction`) | `chat/route.ts` |

### 2. 파일 업로드 용량 제한 해제
- `next.config.mjs`에 `bodySizeLimit: "20mb"` 설정 추가

### 3. API 키 유출 문제 해결
- 초기 Git 커밋에 `.env.local`이 포함되어 Google이 키 차단
- 새 API 키로 교체 완료

### 4. 학습 완료 문서 목록 기능 신규 구현
- `/api/documents` API 엔드포인트 추가 (GET: 목록 조회, DELETE: 삭제)
- 메인 화면에 접이식 "학습된 문서 목록" 패널 추가
- 동일 파일명 중복 업로드 시 경고 및 자동 교체 로직

---

## ⚠️ 수정 요청이 많았던 이슈 (강조)

### 🔴 벡터 차원 불일치 문제 (3회 수정)
1차: `text-embedding-004`(768차원) → `gemini-embedding-001`(3072차원) 교체 시 Supabase 768차원 테이블과 불일치 발생
2차: 3072차원으로 DB 변경 시도 → HNSW 인덱스 2000차원 제한으로 실패
3차: **최종 해결** → LangChain 대신 Google GenAI SDK를 직접 사용하여 `outputDimensionality: 768`로 768차원 출력 제어, DB 스키마 변경 불필요

---

## 🔲 내일 이어서 진행할 작업

### Supabase DB 복구 (필수 - 내일 테스트 전 실행)
아래 SQL을 Supabase SQL Editor(`kdjoqmgijbmgrtvjpqov` 프로젝트)에서 실행:
```sql
DELETE FROM documents;
ALTER TABLE documents ALTER COLUMN embedding TYPE vector(768);
DROP FUNCTION IF EXISTS match_documents;
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (id bigint, content text, metadata jsonb, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT documents.id, documents.content, documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END; $$;
```

### 테스트 항목
- [ ] 파일 업로드 (TXT/PDF) → Supabase 저장 성공 확인
- [ ] 학습된 문서 목록 표시 확인
- [ ] RAG 기반 채팅 질의 → 검색 결과 기반 응답 확인
- [ ] 문서 삭제 및 중복 업로드 경고 확인

---

## 📦 빌드 현황
- **현재 버전**: Alpha V1.008
- **빌드 상태**: 성공 ✅ (`npm run build` 정상)
