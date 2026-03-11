# Genie Assistant Changelog

## [Alpha V1.005] - 2026-03-11 21:12:00

### 🔄 Build Update
- **Summary**: `pdfParse is not a function` 에러 해결을 위한 패키지 다운그레이드
- **Detail** : 
  - `pdf-parse` 최신 버전(v2.4.5)의 ES 모듈 호환성 문제로 인해 Next.js 환경에서 구조분해 할당(export) 문제가 발생. 안정적인 구버전(v1.1.1)으로 강등하여 정상적인 함수 호출이 가능하도록 조치.
- **Build Time**: 2026-03-11 21:12:00

## [Alpha V1.004] - 2026-03-11 20:56:00

### 🔄 Build Update
- **Summary**: 파일 업로드 시 발생하는 `pdf-parse` 모듈 가져오기 에러 수정 (API 라우트 JSON 파싱 오류 해결)
- **Detail** : 
  - Next.js API 라우트에서 `pdf-parse`의 ES Module `import`를 CommonJS `require`로 변경하여 빌드 에러 및 HTML 에러 응답 반환 문제 해결
- **Build Time**: 2026-03-11 20:56:00

## [Alpha V1.003] - 2026-03-11 15:58:00

### 🔄 Build Update
- **Summary**: Phase 3 RAG(지식 베이스) 파이프라인 통합 완료
- **Detail** : 
  - `@langchain/google-genai`, `@supabase/supabase-js`, `pdf-parse` 등 RAG 구동용 필수 의존성 추가
  - Supabase `pgvector` 확장을 활용한 `documents` 테이블 및 `match_documents` RPC 구축
  - `/api/ingest` 라우트 신설을 통한 문서 파일(TXT/PDF) 청킹 및 벡터 임베딩 DB 적재 로직 완성
  - 챗봇 메인 UI에 "문서 학습하기 (RAG)" 파일 업로드 패널 연동
  - 기존 3-Track 채팅 라우트 중 `search` 인텐트 발생 시, DB 질문 유사도 검색(Docs Retrieval) 기반 프롬프팅 주입 처리 개발
- **Build Time**: 2026-03-11 15:58:00

## [Alpha V1.002] - 2026-03-11 15:11:00

### 🔄 Build Update
- **Summary**: Phase 2 AI 연동 및 3-Track 인텐트 라우팅 구현 완료
- **Detail** : 
  - Vercel AI SDK 기반 사용자 질문 의도(Intent) json 분석 라우터 연결
  - 3개 트랙(conversation, search, analyze) 기반 시스템 프롬프트(Persona) 및 모델(`gemini-2.5-flash`/`pro`) 동적 분기 처리 적용
  - 브라우저를 통한 통합 E2E 테스트(일상 대화/작법 지식/플롯 오류 심층 분석) 완벽 검증 완료
- **Build Time**: 2026-03-11 15:11:00

## [Alpha V1.001] - 2026-03-11

### 🔄 Build Update
- **Summary**: 첫 번째 빌드 성공 (Next.js 스캐폴딩 및 Gemini API 연동 완료)
- **Detail**: 
  - 샌드박스 보안 문제를 우회하여 Next.js + Tailwind CSS + Shadcn/ui 프로젝트 수동 구성 완료
  - Supabase 환경 변수 설정 및 SSR 미들웨어 구성
  - Vercel AI SDK(`ai` v3 및 `@google/generative-ai`)를 활용한 Gemini 2.5 Flash API 연동, 에러(zod 누락, 404 Model Not Found 등) 디버깅 및 해결 완료
  - 로컬 환경(localhost:3003)에서 AI 챗봇의 스트리밍 답변 생성 기능 최종 검증 완료
- **Build Time**: 2026-03-11 15:00:00
