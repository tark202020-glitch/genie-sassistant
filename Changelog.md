# Genie Assistant Changelog

## [V1.029] - 2026-05-02

### 📝 대본 정리 페이지 텍스트 기반 UI 전환
- **Summary**: 캐릭터/배경 탭을 Canvas 시각화에서 텍스트 카드/목록으로 전환, 캐릭터 상세 정보 확장
- **Detail**:
  - ✅ `src/components/script-organizer/CharacterTab.tsx`: Canvas/Chord 관계도 제거 → 텍스트 프로필 카드 그리드 (이름/나이/직업/목적/성격/관계)
  - ✅ `src/components/script-organizer/SettingDiagramTab.tsx`: Canvas 다이어그램 제거 → 유형별(실내/실외/차량/가상) 텍스트 목록
  - ✅ `src/app/api/character-graph/route.ts`: AI 프롬프트에 나이/직업/목적/성격/관계요약 추출 추가
  - ✅ `src/app/script-organizer/page.tsx`: 탭 라벨 "캐릭터 관계도" → "캐릭터 분석"
  - ✅ 화별 요약 탭: 현상 유지
  - ✅ 캐릭터 관계도는 숨김 처리 (추후 오픈 예정)
- **Build Time**: 2026-05-02

## [V1.028] - 2026-05-02

### 🎨 로고 이미지 다크/라이트 모드 적용
- **Summary**: PNG 로고(logo_B.png, logo_W.png)를 다크/라이트 테마에 따라 자동 전환하는 PildongLogoImg 컴포넌트 추가
- **Detail**:
  - ✅ `src/components/shared/PildongLogoImg.tsx`: next-themes 기반 테마 전환 이미지 로고 컴포넌트 (SSR 안전)
  - ✅ `src/components/layout/Header.tsx`: 텍스트 "Genie Assistant" → 로고 이미지 + "필동"
  - ✅ `src/app/landing/page.tsx`: SVG PildongLogo → PNG PildongLogoImg 교체 (Nav, Footer)
  - ✅ `src/app/login/page.tsx`: Bot 아이콘 → 로고 이미지, "Genie Assistant" → "필동"
  - ✅ `src/app/register/page.tsx`: Bot 아이콘 → 로고 이미지
  - ✅ `public/logo_B.png`: 라이트 모드용 (검정 로고)
  - ✅ `public/logo_W.png`: 다크 모드용 (흰색 로고)
- **Build Time**: 2026-05-02

## [V1.027] - 2026-05-02

### 🔄 로그아웃 → 랜딩페이지 리다이렉트
- **Summary**: 로그아웃 및 미인증 접근 시 `/login` 대신 `/landing`으로 이동
- **Detail**:
  - ✅ `src/utils/supabase/middleware.ts`: 미인증 리다이렉트 `/login` → `/landing`
  - ✅ `src/components/layout/Header.tsx`: 로그아웃 버튼 리다이렉트 `/login` → `/landing`
- **Build Time**: 2026-05-02

## [V1.026] - 2026-05-02

### 🎵 캐릭터 관계도 Chord 다이어그램 + iPad 호환
- **Summary**: @nivo/chord 기반 Chord 다이어그램 추가 (기존 Canvas 그래프와 토글 비교), iPad/모바일 터치 지원, 분석 결과 저장 기능
- **Detail**:
  - ✅ `src/components/script-organizer/CharacterChordDiagram.tsx`: Nivo Chord 도넛형 시각화 (Steel Blue & Cream 테마)
  - ✅ `src/components/script-organizer/CharacterTab.tsx`: 그래프/코드 뷰 토글, 캐시 저장/로드, 터치 이벤트
  - ✅ `src/components/script-organizer/SettingCanvas.tsx`: 터치 이벤트 + iOS 캔버스 크기 제한 처리
  - ✅ `src/app/api/character-graph/route.ts`: chord matrix + AI 인사이트 응답 추가
  - ✅ `src/app/api/script-analyses/route.ts`: POST 엔드포인트 추가 (저장/업데이트)
  - ✅ `src/app/api/script-organizer/analyze/route.ts`: Gemini 에러 핸들링 강화 (3회 재시도, JSON 추출 폴백, 텍스트 크기 제한)
  - ✅ Chord 인터랙션: 호버 → 클릭 방식으로 변경 (깜빡임 해결)
  - ✅ iPad/모바일: 1손가락 드래그, 2손가락 핀치 줌, iOS 캔버스 16M픽셀 제한 처리
  - ✅ 3개 탭 모두 동일한 저장 패턴: 최초 AI 분석 → DB 캐시 → 재방문 즉시 로드
  - ✅ Gemini 모델명 `gemini-2.5-flash-preview-05-20` → `gemini-2.5-flash` (404 해결)
- **Build Time**: 2026-05-02

## [V1.025] - 2026-05-01

### 📖 대본 정리 페이지 (Script Organizer)
- **Summary**: 작가가 자신의 대본을 시각적으로 분석·정리할 수 있는 전용 페이지 추가 (캐릭터 관계도, 배경 다이어그램, 화별 요약 3탭)
- **Detail**:
  - ✅ `src/app/script-organizer/page.tsx`: 3탭 레이아웃 (캐릭터/배경/화별요약)
  - ✅ `src/components/script-organizer/CharacterTab.tsx`: 기존 character-graph API 재사용, Canvas 물리 시뮬레이션
  - ✅ `src/components/script-organizer/SettingDiagramTab.tsx`: AI 배경 분석 탭 (캐시 우선 로드)
  - ✅ `src/components/script-organizer/SettingCanvas.tsx`: 장소 노드 다이어그램 (유형별 색상, 드래그/줌)
  - ✅ `src/components/script-organizer/EpisodeSummaryTab.tsx`: 화별 요약 탭 (캐시 우선 로드)
  - ✅ `src/components/script-organizer/EpisodeCard.tsx`: 에피소드 카드 (줄거리, 감정톤, 핵심인물/장소)
  - ✅ `src/types/script-organizer.ts`: SettingNode, SettingEdge, EpisodeSummary 타입 + 색상 상수
  - ✅ `src/app/api/script-organizer/analyze/route.ts`: Gemini 배경/화별 분석 API + DB 자동 저장
  - ✅ `src/app/api/script-analyses/route.ts`: 분석 결과 CRUD (캐시 레이어)
  - ✅ `src/components/sidebar/AssistantSelector.tsx`: "대본 정리" 메뉴 추가
  - ✅ `doc/supabase_migration_vector.sql`: script_analyses 테이블 문서화
  - ⚠️ **Supabase에서 script_analyses 테이블 생성 필요** (SQL 파일 참조)
- **Build Time**: 2026-05-01

### 채팅 입력창 자동 확장 + 문서 요약 + 응답 스타일 커스터마이징
- **Summary**: 긴 글 작성을 위한 입력창 자동 높이 조절, 문서 클릭 시 요약 모달, 보조작가 응답 스타일 편집 기능
- **Detail**:
  - ✅ 채팅 입력창 자동 높이 (max 320px)
  - ✅ 문서 핵심 요약: 업로드 시 자동 생성 + 클릭 시 모달 표시
  - ✅ 보조작가 응답 스타일 커스터마이징 UI (설정 다이얼로그)
  - ⚠️ **Supabase에서 document_summaries 테이블 + response_style 컬럼 추가 필요**
- **Build Time**: 2026-05-01

## [V1.024] - 2026-05-01

### 🔍 RAG 파일 지정 검색 개선
- **Summary**: 사용자가 특정 파일을 지정(파일명/카테고리/첨부)하여 질문할 때 해당 파일 기반으로만 답변하도록 RAG 시스템 전면 개선
- **Detail**:
  - ✅ `src/app/api/chat/route.ts`: 인텐트 라우터에 `files[]` + `scope` 필드 추가 (file/script/reference/shared/assistant/all)
  - ✅ `src/app/api/chat/route.ts`: `searchByVector()`에 `sourceFile` 파라미터 추가, 유사도 임계값 0.2→0.35
  - ✅ `src/app/api/chat/route.ts`: `loadSpecificFiles()` 신규 — 파일명 매칭 + 퍼지 폴백
  - ✅ `src/app/api/chat/route.ts`: `loadContextByScope()` 신규 — scope 기반 중앙화된 컨텍스트 로딩
  - ✅ `src/app/api/chat/route.ts`: `listUploadedDocuments()` 개선 — 카테고리별 분류 반환
  - ✅ `src/app/api/chat/route.ts`: `conversation` 인텐트에서 풀텍스트→벡터 검색으로 전환 (토큰 절약)
  - ✅ `src/app/api/chat/route.ts`: `app_id` 참조 전면 제거 (DB에 컬럼 없음)
  - ✅ `doc/supabase_migration_vector.sql`: `match_documents` RPC에 `filter_source_file` 파라미터 추가
  - ⚠️ **Supabase 대시보드에서 `match_documents` RPC 함수 업데이트 필요** (SQL 파일 참조)
- **Build Time**: 2026-05-01

## [V1.023] - 2026-05-01

### 🌙 랜딩 페이지 다크모드 + 로고 SVG 변환
- **Summary**: 랜딩 페이지를 CSS 변수 기반 시맨틱 토큰으로 전환하여 다크모드 지원, 로고를 SVG 컴포넌트로 변환
- **Detail**:
  - ✅ `src/app/landing/page.tsx`: 30+ 하드코딩 색상 → 시맨틱 토큰 (bg-background, text-foreground, bg-card 등)
  - ✅ `src/components/shared/PildongLogo.tsx`: 신규 SVG 로고 컴포넌트 (currentColor 기반, 다크모드 자동 적응)
- **Build Time**: 2026-05-01

## [V1.022] - 2026-05-01

### 🎨 Design Renewal — "Academic Journal on Vellum"
- **Summary**: 전면 디자인 리뉴얼 — 따뜻한 벨럼(양피지) 톤 라이트 테마 + 세리프 제목 서체 + Terra Cotta 악센트
- **Detail** :
  - ✅ `src/app/layout.tsx`: Google Fonts (Inter + Lora) 로드, defaultTheme "dark" → "light" 전환
  - ✅ `tailwind.config.ts`: fontFamily (sans/serif) 추가, terracotta/vellum/parchment 커스텀 색상
  - ✅ `src/app/globals.css`: CSS 변수 전면 교체 (Vellum White 배경, Ink Black 텍스트, Parchment 테두리, Terra Cotta 포커스 링), 다크 모드 따뜻한 톤 보완, 마크다운 스타일 전면 리뉴얼 (세리프 제목, Terra Cotta 링크/인용/마커, 따뜻한 코드 블록)
  - ✅ `src/components/ui/button.tsx`: rounded-md → rounded-lg
  - ✅ `src/components/ui/card.tsx`: shadow-sm 제거
  - ✅ `src/components/ui/input.tsx`: rounded-lg, bg-white dark:bg-background
  - ✅ `src/components/ui/textarea.tsx`: 동일
  - ✅ `src/components/layout/Header.tsx`: 세리프 제목, bg-accent 배지, hover:text-destructive
  - ✅ `src/components/layout/Sidebar.tsx`: bg-card 배경
  - ✅ `src/components/sidebar/DocumentsSection.tsx`: blue/purple/amber/orange 하드코딩 → accent/secondary/terracotta 디자인 시스템 색상
  - ✅ `src/components/sidebar/AssistantSelector.tsx`: purple/green/blue/amber/rose → terracotta/accent/secondary/destructive
  - ✅ `src/components/sidebar/ConversationList.tsx`: purple 배지 → accent, red 삭제 → destructive
  - ✅ `src/components/chat/ChatArea.tsx`: 빈 상태 rounded-lg bg-accent, 세리프 제목
  - ✅ `src/components/chat/ChatInput.tsx`: rounded-lg 통일, bg-white 입력 배경, focus ring → ring
  - ✅ `src/components/chat/MessageBubble.tsx`: 어시스턴트 text-muted-foreground → text-foreground
  - ✅ `src/app/login/page.tsx`: rounded-lg 아이콘, 세리프 제목, text-terracotta 링크
  - ✅ `src/app/register/page.tsx`: 동일 + 성공 아이콘 text-terracotta
  - ✅ `src/components/shared/UploadProgress.tsx`: green/blue/red → terracotta/accent-foreground/destructive
- **Build Time**: 2026-05-01

## [V1.021] - 2026-05-01

### 🔄 Build Update
- **Summary**: 채팅창 파일 첨부 기능 구현 (+ 버튼 / 드래그&드롭) + 버전 중앙관리 적용
- **Detail** :
  - ✅ `src/app/api/chat-upload/route.ts` [NEW]: 채팅 첨부 파일 텍스트 추출 API (PDF/TXT/MD/CSV, 20MB 제한)
  - ✅ `src/components/chat/ChatInput.tsx`: + 버튼 파일 첨부 + 드래그&드롭 지원, 첨부 파일 목록 UI (상태: 업로드 중/완료/오류)
  - ✅ `src/components/chat/ChatArea.tsx`: 채팅 영역 전체 드래그&드롭 오버레이 추가
  - ✅ `src/components/chat/MessageBubble.tsx`: 사용자 메시지에 첨부 파일명 표시 (파일 아이콘 + 이름 배지)
  - ✅ `src/app/page.tsx`: 파일 첨부 상태 관리 + 첨부 텍스트를 메시지에 인라인 포함하여 전송
  - ✅ `src/app/api/chat/route.ts`: `analyze_attachment` 인텐트 추가 (7종 인텐트 라우팅), 첨부 텍스트 분리 처리 (라우터에는 질문만, Gemini에는 전체 전달)
  - ✅ `src/components/layout/Header.tsx`: 하드코딩 V1.000 → `import { APP_VERSION } from '@/lib/version'` 중앙 관리 전환
  - ✅ `src/app/login/page.tsx`: 동일하게 버전 중앙 관리 전환
  - ✅ `src/lib/version.ts`: V1.001 → V1.021 업데이트
  - ✅ `src/app/api/conversations/route.ts`: 디버그 로그 제거
- **Build Time**: 2026-05-01

## [V1.020] - 2026-05-01

### 🔄 Build Update
- **Summary**: 로그인/회원가입 시스템 구현 + 계정별 대화 분리 + GCS 인증 개선
- **Detail** :
  - ✅ `src/lib/auth.ts` [NEW]: 이메일+비밀번호 인증, 세션 관리, PBKDF2 해싱
  - ✅ `src/app/login/page.tsx` [NEW]: 로그인 페이지 (자동 로그인 체크 기능)
  - ✅ `src/app/register/page.tsx` [NEW]: 회원가입 페이지 (이메일 형식 ID)
  - ✅ `src/app/api/auth/*` [NEW]: login/logout/register/me API 엔드포인트
  - ✅ `src/utils/supabase/middleware.ts`: 미인증 시 /login 리다이렉트 가드
  - ✅ `src/app/api/conversations/route.ts`: 계정별 대화 분리 (user_id 필터링)
  - ✅ `src/app/api/conversations/[id]/route.ts`: 본인 대화만 조회/수정/삭제
  - ✅ `src/components/layout/Header.tsx`: 로그인 이메일 + 버전(V1.020) + 로그아웃 버튼
  - ✅ `src/components/sidebar/ConversationList.tsx`: 대화 삭제 + 영구 삭제 확인 모달
  - ✅ `src/lib/gcs.ts` [NEW]: GCS 인증 통합 (JSON 환경변수/파일 경로 자동 감지)
  - ✅ `src/lib/version.ts` [NEW]: 버전 중앙 관리
  - ✅ `src/app/globals.css`: 코드 블록 white-space: pre-wrap 줄넘김 적용
  - ✅ `src/components/ui/scroll-area.tsx`: Radix ScrollArea display:table 오버플로우 수정
  - ✅ `supabase_migration_auth.sql` [NEW]: app_users, app_sessions 테이블 + conversations.user_id 컬럼
  - 🐛 Supabase Auth rate limit 해결 (불필요한 auth.getUser 호출 제거)
  - 🐛 conversations FK 참조 오류 수정 (auth.users → app_users)
  - 🐛 사이드바/채팅 영역 독립 스크롤 수정
  - 🔴 보조작가 대본 전체 로드 + 공유 학습자료 RAG 보조 검색 통합 (search/conversation/analyze 인텐트)
  - 🔴 GCS 초기화 5개 API → 공통 모듈(lib/gcs.ts) 통합
- **Build Time**: 2026-05-01

## [Alpha V1.019] - 2026-03-16 00:56:00

### 🔄 Build Update
- **Summary**: 대본/자료 분석 시 전체 텍스트 사용으로 전환 (RAG 부분 검색 → Full-Text)
- **Detail** :
  - 🔴 `chat/route.ts`: `analyze_script` — RAG 20개 청크 검색 → `getFullDocumentText()`로 대본 전체 텍스트 복원
  - 🔴 `chat/route.ts`: `analyze_reference` — RAG 15개 청크 검색 → 참고자료 전체 텍스트 복원
  - ✅ 대본 분석 시 "처음부터 끝까지 꼼꼼히 읽고 분석" 프롬프트 지시 추가
  - ✅ 대본이 없는 경우 기존 RAG 폴백 유지
  - ✅ Gemini 2.5 Flash 1M 토큰 컨텍스트 활용
  - 🐛 기존 문제: RAG가 대본 앞쪽 몇 페이지(~20청크)만 검색해서 AI가 일부만 보고 답변
- **Build Time**: 2026-03-16 00:56:00

## [Alpha V1.018] - 2026-03-16 00:00:00

### 🔄 Build Update
- **Summary**: 캐릭터 관계도 전용 페이지 구현 (`/character-graph`)
- **Detail** :
  - ✅ `api/character-graph/route.ts` [NEW]: 선택된 보조작가의 대본에서 Gemini AI로 캐릭터/관계 자동 추출 API
  - ✅ `character-graph/page.tsx` [NEW]: Canvas force-directed 네트워크 그래프로 캐릭터 관계 시각화
  - ✅ 캐릭터 역할별 색상/아이콘 (주인공⭐, 조연👤, 적대자🔥, 조력자🤝)
  - ✅ 관계 유형별 색상 (가족🟢, 연인🩷, 적대🔴, 동료🔵)
  - ✅ 화별 최신 버전 자동 필터링 (V4.8/V4.9 → V4.9만 선택)
  - ✅ 노드 드래그, 줌/팬, 호버 상세 정보 인터랙션
  - ✅ `page.tsx`: 보조작가 상세에 "🎭 캐릭터 관계도 보기" 링크 버튼 추가
  - ✅ `assistantId` 쿼리 파라미터로 동적 처리 (모든 보조작가 지원)
- **Build Time**: 2026-03-16 00:00:00

## [Alpha V1.017] - 2026-03-15 20:57:00

### 🔄 Build Update
- **Summary**: 블랙위도우 비교 파일 선택 버그 수정 — 보조작가 문서 우선 선택
- **Detail** :
  - ✅ `chat/route.ts`: `listUploadedDocuments()` 반환값을 `{ assistantFiles, sharedFiles }` 구조로 변경하여 보조작가/공유 문서 구분
  - ✅ 인텐트 라우터 프롬프트에 `[보조작가 전용 문서]` / `[공유 문서]` 구분 표시 및 보조작가 문서 우선 선택 지시 추가
  - ✅ `compare_scripts` 폴백 로직에서 보조작가 문서가 2개 이상일 때 보조작가 문서만 우선 사용
  - 🐛 기존 문제: 보조작가 활성화 상태에서 비교 요청 시 공유 학습자료(미드포인트구조이론.pdf 등)가 잘못 선택됨
- **Build Time**: 2026-03-15 20:57:00

## [Alpha V1.016] - 2026-03-15 17:18:00

### 🔄 Build Update
- **Summary**: 대본 비교(compare_scripts) 기능 구현 + RAG 임베딩 안정화
- **Detail** :
  - ✅ `chat/route.ts`: `compare_scripts` 인텐트 추가 (6종 인텐트 라우팅)
  - ✅ `getFullDocumentText()` 함수: pgvector에서 전체 청크를 순서대로 복원하여 Full-Text 비교
  - ✅ `listUploadedDocuments()` 함수: 업로드된 문서 목록을 인텐트 라우터에 제공
  - ✅ 대본 비교 시스템 프롬프트: S# 단위 비교, 대사/지문/구조 변경 탐지, 작가 의도 추론
  - ✅ `embeddings.ts`: 임베딩 모델 `gemini-embedding-001`로 변경 (text-embedding-004 종료 대응)
  - ✅ Rate Limit 429 재시도 로직 (최대 3회, 5~10초 대기) + 요청 간 1초 지연
  - ✅ `maxDuration` 60초 → 300초 확장 (대용량 파일/대본 비교 처리)
  - ✅ RAG 검색량 차등 적용: 대본분석 20개, 자료분석 15개, 일반검색 10개 청크
  - ✅ 유사도 임계값 0.3 → 0.2로 완화
- **Build Time**: 2026-03-15 17:18:00

## [Alpha V1.015] - 2026-03-15 15:15:00

### 🔄 Build Update
- **Summary**: Vector RAG 업그레이드 (Discovery Engine → Supabase pgvector) + 지식 그래프 시각화
- **Detail** :
  - 🔴 RAG 아키텍처 전면 전환: Google Vertex AI Search (Discovery Engine) → Supabase pgvector 기반 Vector RAG
  - ✅ `src/lib/embeddings.ts` [NEW]: Google `text-embedding-004` 임베딩 생성, LangChain 텍스트 청킹, PDF/TXT 텍스트 추출 유틸리티
  - ✅ `src/types/pdf-parse.d.ts` [NEW]: pdf-parse TypeScript 타입 선언
  - ✅ `api/ingest/route.ts`: 파일→텍스트 추출→청킹→임베딩→pgvector 저장 파이프라인으로 전환
  - ✅ `api/assistants/[id]/ingest/route.ts`: 레벨2 전용 Vector RAG 파이프라인 (assistant_id, doc_type 구분)
  - ✅ `api/chat/route.ts`: SearchServiceClient → Supabase `match_documents` RPC 코사인 유사도 검색으로 전환
  - ✅ `api/documents/route.ts`: Discovery Engine listDocuments → pgvector 테이블 쿼리로 전환
  - ✅ `api/assistants/[id]/documents/route.ts`: 레벨2 문서 목록 pgvector 전환
  - ✅ `api/knowledge-graph/route.ts` [NEW]: 문서 간 코사인 유사도 계산 + 보조작가/문서 노드 그래프 데이터 API
  - ✅ `knowledge-graph/page.tsx` [NEW]: Canvas 기반 force-directed 네트워크 그래프 시각화 (줌/팬/드래그/유사도 필터)
  - ✅ `@google-cloud/discoveryengine` 패키지 제거 (79개 패키지 삭제)
  - ✅ `doc/supabase_migration_vector.sql` [NEW]: pgvector 마이그레이션 SQL 스크립트
  - ⚠️ Supabase SQL Editor에서 `supabase_migration_vector.sql` 수동 실행 필요
- **Build Time**: 2026-03-15 15:15:00

## [Alpha V1.014] - 2026-03-15 11:26:00

### 🔄 Build Update
- **Summary**: 다중 파일 업로드 기능 구현 — 공유 학습자료 + 보조작가 전용 자료
- **Detail** :
  - ✅ `page.tsx`: `<input type="file">` 에 `multiple` 속성 추가, 파일 상태를 `File | null` → `File[]` 배열로 변경
  - ✅ 공유 학습자료(레벨1) 다중 파일 순차 업로드 로직 구현 (기존 API 그대로 활용)
  - ✅ 보조작가 전용 자료(레벨2) 다중 파일 순차 업로드 로직 구현
  - ✅ 선택된 파일 개수 & 파일명 목록 표시 UI 추가
  - ✅ 업로드 진행률 표시 (예: "(2/5) example.txt GCS에 업로드 중...")
  - ✅ 전체 완료 시 성공/실패 요약 메시지 표시
  - ✅ 백엔드 API 변경 없음 — 프론트엔드 순차 호출 방식
- **Build Time**: 2026-03-15 11:26:00

## [Alpha V1.013] - 2026-03-15 01:40:00

### 🔄 Build Update
- **Summary**: 보조작가 업로드 로직 개선 — 대본/자료 분리 시스템
- **Detail** :
  - ✅ `page.tsx`: 업로드 UI에 📜대본/📚자료 선택 탭 추가, 문서 목록 대본/자료 섹션 구분 표시
  - ✅ `assistants/[id]/ingest/route.ts`: docType별 GCS 하위 폴더 분리 (scripts/, references/)
  - ✅ `assistants/[id]/documents/route.ts`: docType 필드 반환 (GCS 경로에서 자동 감지)
  - ✅ `chat/route.ts`: 인텐트 라우터 5가지로 확장 (conversation/search/analyze_script/analyze_reference/analyze)
  - ✅ 대본 분석 시 서사구조/캐릭터 아크 특화 프롬프트, 자료 분석 시 정보 추출/요약 특화 프롬프트
  - ✅ 기존 루트 폴더 파일(블랙위도우 1~4부 대본)은 자동으로 'script' 분류
- **Build Time**: 2026-03-15 01:40:00


## [Alpha V1.012] - 2026-03-15 01:12:00

### 🔄 Build Update
- **Summary**: 답변 UI 개선 — 블랙위도우 보조작가 이름 + 마크다운 렌더링 적용
- **Detail** :
  - ✅ `react-markdown` + `remark-gfm` 패키지 설치
  - ✅ `page.tsx`: 답변자 이름 'Genie 보조작가' → '블랙위도우 보조작가'로 변경, AI 응답을 `ReactMarkdown` 컴포넌트로 렌더링
  - ✅ `chat/route.ts`: 기본 assistantName을 '블랙위도우'로 변경, 시스템 프롬프트에 마크다운 형식 답변 지시 추가
  - ✅ `globals.css`: 마크다운 렌더링 전용 CSS 스타일 추가 (제목, 목록, 코드블록, 테이블, 인용문, 구분선 등 프리미엄 다크 디자인)
- **Build Time**: 2026-03-15 01:12:00


## [Alpha V1.011] - 2026-03-14 11:15:00

### 🔄 Build Update
- **Summary**: 지식레벨2 보조작가 시스템 구현
- **Detail** :
  - ✅ Supabase `assistants` 테이블 생성 (name, specialty, persona, data_store_id)
  - ✅ `/api/assistants` — 보조작가 CRUD + Discovery Engine 데이터 스토어 자동 생성/삭제
  - ✅ `/api/assistants/[id]/ingest` — 보조작가 전용 GCS 폴더 업로드 + Import
  - ✅ `/api/assistants/[id]/documents` — 보조작가 전용 문서 목록/삭제
  - ✅ `chat/route.ts` — 레벨1(공유) + 레벨2(보조작가 전용) 결합 검색, 보조작가 페르소나 반영
  - ✅ `page.tsx` — 2탭 사이드바 (📚 공유 학습자료 / 🤖 보조작가 관리)
  - ✅ 채팅 헤더에 활성 보조작가 표시 + 해제 기능
- **Build Time**: 2026-03-14 11:15:00

## [Alpha V1.010] - 2026-03-13 19:14:00

### 🔄 Build Update
- **Summary**: 좌측 사이드바 UI 전면 개편 + RAG 검색 버그 수정
- **Detail** :
  - 🔴 `page.tsx` 전면 재작성: 2-panel 레이아웃(좌측 사이드바 + 우측 채팅)으로 전환
  - ✅ "작가학습자료" 좌측 사이드바: 문서 목록, 파일 업로드, 삭제 기능 통합
  - ✅ 업로드 시 3단계 프로그레스 표시(GCS 업로드 → AI 인덱싱 → 완료)
  - ✅ 삭제 시 단계별 로딩 표시(GCS 삭제 → 인덱스 제거 → 완료)
  - ✅ "학습하기" 버튼 그라데이션(blue→purple) 스타일로 눈에 띄게 변경
  - 🔧 `chat/route.ts`: chunking config 데이터 스토어와 호환 안되는 `extractiveContentSpec` 제거, `searchResultMode: 'CHUNKS'` 추가
  - 🔧 인텐트 라우터: 문서 질문도 "search"로 분류하도록 프롬프트 확장
- **Build Time**: 2026-03-13 19:14:00

## [Alpha V1.009] - 2026-03-13 18:43:00

### 🔄 Build Update
- **Summary**: RAG 아키텍처 전면 전환 — Supabase pgvector → Vertex AI AI Applications (Discovery Engine)
- **Detail** :
  - 🔴 `chat/route.ts`: Supabase 유사도 검색 + Gemini Embedding → Vertex AI Search API (`SearchServiceClient`) 기반 문서 검색으로 전면 교체
  - 🔴 `ingest/route.ts`: PDF 파싱+임베딩 → GCS 업로드 + Discovery Engine `importDocuments()` API로 데이터 스토어 자동 등록
  - 🔴 `documents/route.ts`: Supabase 문서 목록 → Discovery Engine `DocumentServiceClient` + GCS 폴백으로 변경
  - 🟡 `page.tsx`: 문서 목록 UI를 청크 기반 → 인덱싱 상태 기반으로 변경, Import 실패 시 경고 메시지 표시
  - ✅ `@google-cloud/discoveryengine`, `@google-cloud/storage` 패키지 추가
  - ✅ GCP 서비스 계정 인증 및 환경 변수 설정 (프로젝트: `rag-bighistory`)
- **Build Time**: 2026-03-13 18:43:00

## [Alpha V1.008] - 2026-03-13 01:08:20

### 🔄 Build Update
- **Summary**: 학습 완료 문서 목록 조회/삭제 기능 및 중복 업로드 방지 구현
- **Detail** :
  - 새 API 엔드포인트 `/api/documents` 추가 (GET: 문서 목록, DELETE: 문서 삭제)
  - 메인 화면에 접이식 "학습된 문서 목록" 패널 추가 (파일명, 청크 수, 삭제 버튼)
  - 파일 업로드 시 동일 파일명 중복 경고 및 자동 교체(삭제 후 재업로드) 로직 추가
  - Supabase 벡터 차원 불일치 발견 (768 vs 3072) — 테이블 스키마 변경 필요
- **Build Time**: 2026-03-13 01:08:20

## [Alpha V1.007] - 2026-03-13 00:58:31

### 🔄 Build Update
- **Summary**: RAG 아키텍처 전반 시스템 점검 및 4대 핵심 이슈 수정
- **Detail** :
  - 🔴 임베딩 모델 교체: `text-embedding-004` (2026-01-14 종료) → `gemini-embedding-001` (Google 공식 후속 모델)
  - 🔴 Edge Runtime 제거: `chat/route.ts`에서 `export const runtime = 'edge'` 삭제 (LangChain Node.js 전용 호환성 문제 해결)
  - 🟡 배치 임베딩 구현: `ingest/route.ts`에서 순차 `embedQuery()` → `embedDocuments()` 배치 처리로 성능 대폭 향상
  - 🟡 멀티턴 대화 개선: `chat/route.ts`에서 `join('\n')` 단순 합산 → Gemini `startChat()` + `systemInstruction` 기반 올바른 역할 구분
  - 파일 업로드 용량 제한 해제: `next.config.mjs`에 `bodySizeLimit: "20mb"` 설정 추가
  - Google API 키 유출 감지 → 새 API 키로 교체
- **Build Time**: 2026-03-13 00:58:31

## [Alpha V1.006] - 2026-03-11 21:51:00

### 🔄 Build Update
- **Summary**: RAG 파일 업로드 진행 프로세스 및 에러 메시지 한글화 적용
- **Detail** : 
  - `/api/ingest/route.ts` 서버 측 콘솔 로그 및 클라이언트 반환 에러 메시지들을 영문에서 한글로 전면 번역 및 반영하여 인지 과정 향상
- **Build Time**: 2026-03-11 21:51:00

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
