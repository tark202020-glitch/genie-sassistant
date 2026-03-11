# 🚀 AI 보조작가 프로그램 구현 계획 (Implementation Plan)

## 📌 1. 프로젝트 목표 (Goal Description)
시나리오 및 드라마 작가를 위한 맞춤형 AI 보조작가 프로그램 개발. 
사용자의 일상적인 대화, 대본의 기본 지식, 그리고 전문 도메인 지식을 바탕으로 각기 다른 특성을 가진 AI 보조작가들을 제공하여 창작 활동을 지원합니다. 전문가의 조언을 바탕으로, 생산성과 UX를 극대화할 수 있는 인프라 및 핵심 기술 스택을 도입하여 시스템을 고도화합니다.

---

## 🏗️ 2. 시스템 아키텍처 및 핵심 기술 사양 (Architecture & Tech Stack)
기존 아키텍처에서 **바이브 코딩 최적화 및 UX 향상**을 위해 다음과 같은 기술 스택이 보완/확정되었습니다.

- **Frontend / Full-stack Framework:** Next.js (App Router 기반)
- **Styling / UI Components:** Tailwind CSS + **Shadcn/ui & Framer Motion** (시각적 몰입감과 가벼운 인터랙션 강화)
- **Rich Text Editor:** **Novel.js** (Notion 스타일의 WYSIWYG 에디터 도입으로 작가의 익숙한 환경 제공)
- **Database / Auth:** Supabase (PostgreSQL) + **Supabase Auth & Middleware** (사용자별 안전한 데이터 접근 제어)
- **Hosting / Deployment:** Vercel
- **AI Models:** Gemini 2.5 Pro (깊은 분석 및 추론) & Gemini 2.5 Flash (빠른 대화 전용)
- **AI Orchestration & RAG:** **Vercel AI SDK**, **LangChain.js (또는 LlamaIndex)**
- **Version Control:** GitHub 

### 🛠️ 추가된 MCP 서버 연동 (안비그라비티 개발 가속화 용도)
실제 코드 구현 전/후 단계에서 AI 보조 작가의 생산성을 높이기 위해 다음의 MCP를 적극 활용합니다.
1. `postgres-mcp`: Supabase DB 및 pgvector 스키마 설계 및 직접 제어
2. `google-generative-ai-mcp`: 시스템 프롬프트 사전 테스트 및 3-Track 라우팅 시뮬레이션
3. `github-mcp`: Changelog 자동화, PR 반영 등 지속적인 버전 관리
4. `sequential-thinking-mcp`: 복잡한 대본 분석 로직 설계 시 사고의 구조화 지원

---

## 🧠 3. 핵심 AI 로직: 3-Track 인텐트 라우팅 (Key AI Logic)
토큰 최적화 및 컨텍스트 오염 방지를 위해 사용자의 요청(Intent)에 따라 처리를 3가지 트랙으로 엄격히 분리합니다. **이 과정은 Vercel AI SDK(`streamText`, `toolCall` 등)를 활용하여 유연하게 오케스트레이션됩니다.**

1. **일상 대화 트랙 (Gemini Flash 활용)**
   - RAG 또는 대규모 DB 검색 없이 가벼운 컨텍스트만으로 응답 (스트리밍 최적화)
2. **지식 검색 트랙 (RAG 기반, LangChain.js / LlamaIndex 연계)**
   - 작가의 지식 베이스(도메인 지식, 캐릭터/세계관 설정 등)에서 필요한 내용만 Vector DB(Supabase pgvector)를 통해 검색 후 답변
3. **대본 전체 분석 트랙 (Gemini Pro 활용, Sequential Thinking 적용)**
   - 대규모 스크립트 파일을 업로드하고, 전체 컨텍스트를 기반으로 등장인물 추출, 공간 리스트업, 미드포인트/시퀀스 분석, 떡밥 회수 추적, 맞춤법 검사 등 집중적인 다단계 추론 분석 수행

---

## 🗺️ 4. 개발 로드맵 (Development Roadmap)

### [Phase 1] 셋업 및 인프라 구축 (UI / Auth 중심)
- [ ] Next.js + Tailwind CSS + Shadcn/ui 기본 스캐폴딩 설정
- [ ] Framer Motion 초기 설정 (라우팅 트랜지션 등)
- [ ] Supabase 프로젝트 연동 및 사용자/보조작가 DB 초기 모델링 (postgres-mcp 활용 고려)
- [ ] Supabase Auth 및 Middleware를 통한 라우트 프로텍션(Route Protection) 구현

### [Phase 2] AI 연동 및 프롬프트 엔지니어링 뼈대 (Vercel AI SDK)
- [ ] Vercel AI SDK 기반 Gemini 2.5 API 연동
- [ ] 3-Track 인텐트 라우팅 미들웨어/서비스 구현 (toolCall 연동)
- [ ] Novel.js 에디터를 포함한 문서 작성 및 기본 채팅 UI 설계

### [Phase 3] 지식 베이스(RAG) 파이프라인 (LangChain 연계)
- [ ] 대본/참고 자료 업로드 및 파싱 기능 탑재
- [ ] LangChain.js(또는 LlamaIndex)를 활용한 Text Chunking, Embedding 생성 파이프라인
- [ ] Supabase pgvector 적재 및 고도화된 Similarity Search 라우트 생성

### [Phase 4] 심화 분석 기능 구현 (대본 전체 트랙)
- [ ] 대본 전체 분석 페이지 구성 및 Novel.js 에디터 연동 출력
- [ ] 기능별 Multi-turn/Sequential Task 처리 (등장인물, 공간, 미드포인트, 플롯 분석 등)
- [ ] 분석 결과 가시화 및 리포트 다운로드 제공

### [Phase 5] 폴리싱 및 시스템 안정화
- [ ] 각 보조작가별 성격(Persona), 말투 적용 등 세부 프롬프트 튜닝 (generative-ai-mcp 활용)
- [ ] 전역 에러 핸들링 및 UI 로딩 모션 디테일(Framer Motion) 강화
- [ ] github-mcp를 이용한 Changelog 정리 및 v1.0 정규 배포 완료

---

## 🔎 5. 사용자 검토 요청 방안 (User Review Required)
- **프론트엔드 UI/UX:** `Shadcn/ui` 및 `Novel.js` 기반의 에디터-채팅 복합 화면 구조에 대한 초안 리뷰가 필요할 수 있습니다.
- **RAG 스택 결정:** 도입될 LangChain.js 와 LlamaIndex 사이에서, 데이터 구조가 조금 정립된 후 가벼운 PoC(기술 검증)를 거치는 것을 제안합니다.

---

> [!NOTE] 
> 본 계획서는 전문가 피드백을 수용하여 작성되었으며, 작업 전반에 걸쳐 유동적으로 업데이트 될 수 있습니다. 모든 빌드 기록은 `Changelog.md`에 <RULE>에 맞춰 누적 기록합니다.
