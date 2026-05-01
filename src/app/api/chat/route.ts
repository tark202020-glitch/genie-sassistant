import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ────────────────────── pgvector 유사도 검색 ──────────────────────
async function searchByVector(
  query: string,
  assistantId?: string | null,
  docTypeFilter?: 'script' | 'reference' | 'all' | null,
  matchCount: number = 10,
  sourceFile?: string | null          // ★ Phase 3: 특정 파일만 검색
): Promise<string> {
  console.log(`[RAG] 벡터 검색 시작 | 쿼리: "${query.substring(0, 50)}" | 보조작가: ${assistantId || '없음'} | 필터: ${docTypeFilter || 'all'} | 파일: ${sourceFile || '전체'} | 검색수: ${matchCount}`);

  try {
    const queryEmbedding = await generateEmbedding(query);

    // 레벨1 검색 (공유 지식 — assistant_id가 NULL인 문서)
    const { data: level1Results, error: l1Err } = await supabase.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.35,           // ★ Phase 3: 0.2 → 0.35
      match_count: matchCount,
      filter_assistant_id: null,
      filter_doc_type: (docTypeFilter && docTypeFilter !== 'all') ? docTypeFilter : null,
      filter_source_file: sourceFile || null,  // ★ Phase 2: source_file 필터
    });

    if (l1Err) console.error('[RAG] 레벨1 검색 오류:', l1Err.message);
    console.log(`[RAG] 레벨1 검색: ${level1Results?.length || 0}개 결과`);

    // 레벨2 검색 (보조작가 전용 지식)
    let level2Results: any[] = [];
    let assistantName = '';
    if (assistantId) {
      const { data: assistant } = await supabase
        .from('assistants')
        .select('name')
        .eq('id', assistantId)
        .single();
      assistantName = assistant?.name || '';

      const { data: l2Data, error: l2Err } = await supabase.rpc('match_documents', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.35,         // ★ Phase 3: 0.2 → 0.35
        match_count: matchCount,
        filter_assistant_id: assistantId,
        filter_doc_type: (docTypeFilter && docTypeFilter !== 'all') ? docTypeFilter : null,
        filter_source_file: sourceFile || null,  // ★ Phase 2: source_file 필터
      });

      if (l2Err) console.error('[RAG] 레벨2 검색 오류:', l2Err.message);
      level2Results = l2Data || [];
      console.log(`[RAG] 레벨2 검색 (${assistantName}): ${level2Results.length}개 결과`);
    }

    // 결과 합치기 (레벨2 우선)
    const allContexts: string[] = [];

    for (const r of level2Results) {
      const label = `전문자료(${assistantName})`;
      allContexts.push(`[${label} - ${r.source_file}] (유사도: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`);
    }

    for (const r of (level1Results || [])) {
      allContexts.push(`[공유자료 - ${r.source_file}] (유사도: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`);
    }

    if (allContexts.length > 0) {
      return allContexts.join('\n---\n');
    }
    return '';

  } catch (err: any) {
    console.error('[RAG] 벡터 검색 실패:', err.message);
    return '';
  }
}

export const maxDuration = 300;

// ────────────────────── 풀텍스트 복원 ──────────────────────
async function getFullDocumentText(sourceFile: string, assistantId?: string | null): Promise<string> {
  // 1차: assistantId 지정 시 보조작가 문서에서 검색
  if (assistantId) {
    const { data, error } = await supabase
      .from('documents')
      .select('content')
      .eq('source_file', sourceFile)
      .eq('assistant_id', assistantId)
      // ★ Phase 5: .eq('app_id', APP_ID) 제거
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      console.log(`[FullText] ${sourceFile}: ${data.length}개 청크 복원 (보조작가)`);
      return data.map(d => d.content).join('\n');
    }
  }

  // 2차: 공유 문서에서 검색 (폴백)
  const { data, error } = await supabase
    .from('documents')
    .select('content')
    .eq('source_file', sourceFile)
    .is('assistant_id', null)
    // ★ Phase 5: .eq('app_id', APP_ID) 제거
    .order('id', { ascending: true });

  if (error) {
    console.error(`[FullText] ${sourceFile} 조회 오류:`, error.message);
    return '';
  }

  if (!data || data.length === 0) return '';
  console.log(`[FullText] ${sourceFile}: ${data.length}개 청크 복원 (공유)`);
  return data.map(d => d.content).join('\n');
}

// ────────────────────── 문서 목록 조회 ──────────────────────
async function listUploadedDocuments(assistantId?: string | null): Promise<{
  assistantFiles: string[];
  sharedFiles: string[];
  assistantScripts: string[];
  assistantReferences: string[];
}> {
  const assistantFiles: string[] = [];
  const assistantScripts: string[] = [];
  const assistantReferences: string[] = [];
  const sharedFiles: string[] = [];

  // 보조작가 문서 (doc_type 포함 조회)
  if (assistantId) {
    const { data } = await supabase
      .from('documents')
      .select('source_file, doc_type')
      .eq('assistant_id', assistantId)
      // ★ Phase 5: .eq('app_id', APP_ID) 제거
      .order('source_file', { ascending: true });
    if (data) {
      const uniqueFiles = new Map<string, string>();
      for (const d of data) {
        if (!uniqueFiles.has(d.source_file)) {
          uniqueFiles.set(d.source_file, d.doc_type);
        }
      }
      for (const [file, docType] of uniqueFiles) {
        assistantFiles.push(file);
        if (docType === 'reference') assistantReferences.push(file);
        else assistantScripts.push(file);
      }
    }
  }

  // 공유 문서
  const { data: sharedData } = await supabase
    .from('documents')
    .select('source_file')
    .is('assistant_id', null)
    // ★ Phase 5: .eq('app_id', APP_ID) 제거
    .order('source_file', { ascending: true });
  if (sharedData) sharedFiles.push(...[...new Set(sharedData.map(d => d.source_file))]);

  return { assistantFiles, sharedFiles, assistantScripts, assistantReferences };
}

// ────────────────────── 지정 파일만 풀텍스트 로드 (헬퍼) ──────────────────────
async function loadSpecificFiles(
  files: string[],
  assistantId?: string | null,
  assistantFiles?: string[],
  sharedFiles?: string[]
): Promise<{ name: string; text: string }[]> {
  const results: { name: string; text: string }[] = [];
  for (const fileName of files) {
    // 보조작가 문서 → 공유 문서 순으로 시도
    const text = await getFullDocumentText(fileName, assistantId);
    if (text) {
      results.push({ name: fileName, text });
    } else {
      // 파일명이 정확하지 않을 수 있으므로 부분 매칭 시도
      const allPool = [...(assistantFiles || []), ...(sharedFiles || [])];
      const fuzzyMatch = allPool.find(f =>
        f.toLowerCase().includes(fileName.toLowerCase()) ||
        fileName.toLowerCase().includes(f.replace(/\.[^.]+$/, '').toLowerCase())
      );
      if (fuzzyMatch && fuzzyMatch !== fileName) {
        const matchedText = await getFullDocumentText(fuzzyMatch, assistantId);
        if (matchedText) {
          console.log(`[FullText] 부분 매칭: "${fileName}" → "${fuzzyMatch}"`);
          results.push({ name: fuzzyMatch, text: matchedText });
        }
      }
    }
  }
  return results;
}

// ══════════════════════ POST 핸들러 ══════════════════════
export async function POST(req: Request) {
  const { messages, assistantId } = await req.json();

  // 1. 사용자 마지막 메시지를 추출
  const rawLastMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

  // 첨부 파일 텍스트 분리
  const attachmentMarker = '\n\n---\n[첨부 파일: ';
  const hasAttachment = rawLastMessage.includes(attachmentMarker);
  const lastUserMessage = hasAttachment
    ? rawLastMessage.substring(0, rawLastMessage.indexOf(attachmentMarker))
    : rawLastMessage;
  const attachmentText = hasAttachment
    ? rawLastMessage.substring(rawLastMessage.indexOf(attachmentMarker))
    : '';

  // 보조작가 정보 조회
  let assistantInfo: any = null;
  if (assistantId) {
    const { data } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();
    assistantInfo = data;
  }

  // ────────── 2. 인텐트 라우팅 (★ Phase 1: 고도화) ──────────
  const routerModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const { assistantFiles, sharedFiles, assistantScripts, assistantReferences } = await listUploadedDocuments(assistantId);
  const allFiles = [...assistantFiles, ...sharedFiles];

  // ★ Phase 1: 문서 목록을 카테고리별로 구분하여 제공
  let fileListStr = '';
  if (assistantId && assistantFiles.length > 0) {
    const parts = [];
    if (assistantScripts.length > 0) parts.push(`[보조작가 대본] ${assistantScripts.join(', ')}`);
    if (assistantReferences.length > 0) parts.push(`[보조작가 자료] ${assistantReferences.join(', ')}`);
    if (sharedFiles.length > 0) parts.push(`[공유 자료] ${sharedFiles.join(', ')}`);
    fileListStr = parts.join('\n  ');
  } else {
    fileListStr = allFiles.length > 0 ? `[공유 자료] ${allFiles.join(', ')}` : '없음';
  }

  // ★ Phase 1: 개선된 라우터 프롬프트 — files + scope 추출
  const routerPrompt = `
  다음 사용자 메시지를 분석하여 인텐트(intent), 대상 파일(files), 검색 범위(scope)를 판별하세요.

  ## 인텐트 분류 (7가지)
  1. "conversation": 단순 인사, 일상 대화, 격려 요청, 잡담.
  2. "search": 정보 검색, 업로드 문서에 대한 질문, 지식 검색.
  3. "analyze_script": 대본/시나리오 분석 (미드포인트, 캐릭터 아크, 플롯 구조 등).
  4. "analyze_reference": 참고자료 분석, 요약, 정리.
  5. "analyze": 사용자가 직접 작성한 텍스트의 평가/피드백.
  6. "compare_scripts": 두 개 이상 대본/버전 비교.
  7. "analyze_attachment": 채팅에 파일 직접 첨부 후 질문.

  ## 판별 규칙
  ${hasAttachment ? '- ⚠️ 파일이 채팅에 직접 첨부됨 → "analyze_attachment" 우선.' : ''}
  - "비교", "차이점", "달라진", "vs", "비교해" → "compare_scripts"
  - 단일 대본 분석 → "analyze_script"
  - "자료", "논문", "레퍼런스" → "analyze_reference"
  - 사용자가 직접 작성한 텍스트 평가 → "analyze"

  ## 파일명 추출 규칙 (★ 중요)
  사용자가 특정 파일명을 언급하면 files 배열에 포함하세요.
  - 확장자가 있으면: 정확히 매칭 (예: "시나리오_구조론.pdf" → ["시나리오_구조론.pdf"])
  - 확장자 없이 줄여 부르면: 문서 목록에서 가장 유사한 파일명 매칭 (예: "구조론" → ["시나리오_구조론.pdf"])
  - 파일명 미언급 시: files를 빈 배열([])로

  ## 검색 범위(scope) 판별 규칙
  - "공유 자료에서", "공유 문서" → "shared"
  - "전용 자료", "보조작가 자료" → "assistant"
  - "대본에서", "대본 기반", "스크립트에서" → "script"
  - "자료에서", "레퍼런스에서", "참고자료" → "reference"
  - 특정 파일명 지정 시 → "file"
  - 범위 미지정 → "all"

  ## 현재 업로드된 문서 목록
  ${fileListStr}

  ${assistantId ? '주의: 보조작가가 활성화 상태입니다. 파일 선택 시 보조작가 전용 문서를 우선하세요.' : ''}

  ## 응답 형식 (JSON)
  {"intent": "...", "files": ["file1.pdf"], "scope": "file"}

  사용자 메시지: "${lastUserMessage}"
  `;

  let intent = "conversation";
  let targetFiles: string[] = [];
  let scope = "all";

  try {
    const routerResult = await routerModel.generateContent(routerPrompt);
    const routerResponseText = routerResult.response.text();
    const parsed = JSON.parse(routerResponseText);

    if (["conversation", "search", "analyze_script", "analyze_reference", "analyze", "compare_scripts", "analyze_attachment"].includes(parsed.intent)) {
      intent = parsed.intent;
    }
    if (parsed.files && Array.isArray(parsed.files)) {
      targetFiles = parsed.files;
    }
    if (parsed.scope && ["all", "shared", "assistant", "script", "reference", "file"].includes(parsed.scope)) {
      scope = parsed.scope;
    }
    // 파일 지정인데 scope가 all이면 file로 보정
    if (targetFiles.length > 0 && scope === 'all') {
      scope = 'file';
    }
    if (hasAttachment && intent !== 'analyze_attachment') {
      intent = 'analyze_attachment';
    }

    console.log(`[Intent Router] intent: ${intent} | files: [${targetFiles.join(', ')}] | scope: ${scope}${hasAttachment ? ' | 첨부파일 있음' : ''}`);
  } catch (error) {
    console.error("[Intent Router] Classification failed, fallback to search", error);
    intent = hasAttachment ? "analyze_attachment" : "search";
  }

  // ────────── 3. 시스템 프롬프트 구성 ──────────
  const assistantName = assistantInfo?.name || '블랙위도우';
  const assistantPersona = assistantInfo?.persona || '';
  const assistantSpecialty = assistantInfo?.specialty || '';

  const markdownInstruction = `
답변은 반드시 Markdown 형식으로 작성하세요. 다음 규칙을 따르세요:
- 주요 주제는 ### 제목을 사용하세요.
- 핵심 키워드나 중요한 부분은 **볼드체**로 강조하세요.
- 항목을 나열할 때는 번호 목록(1. 2. 3.) 또는 bullet 목록(- 또는 *)을 사용하세요.
- 구분이 필요한 섹션 사이에는 --- 구분선을 사용하세요.
- 인용이 필요할 때는 > 인용 블록을 사용하세요.
- 대본이나 코드 형태의 내용은 코드 블록(\`\`\`으로 감싸기)을 사용하세요.
`;

  let basePersona = '';
  if (assistantInfo) {
    basePersona = `당신은 "${assistantName}"이라는 전문 보조작가입니다.
    전문 분야: ${assistantSpecialty}
    ${assistantPersona ? `페르소나: ${assistantPersona}` : ''}
    사용자의 질문에 당신의 전문 분야에 맞는 깊이 있는 답변을 제공해주세요.
    ${markdownInstruction}`;
  } else {
    basePersona = `당신은 시나리오/드라마 작가를 돕는 '블랙위도우' 보조작가입니다.
    ${markdownInstruction}`;
  }

  let targetModelName = 'gemini-2.5-flash';
  let systemPrompt = '';

  // ★ Phase 4: scope/files 기반 컨텍스트 로딩 헬퍼
  // 특정 파일 풀텍스트 로드 vs 전체 로드를 공통 패턴으로 추출
  async function loadContextByScope(
    docTypeHint?: 'script' | 'reference'
  ): Promise<{ fullTexts: { name: string; text: string }[]; ragContext: string }> {
    let fullTexts: { name: string; text: string }[] = [];

    // (A) 특정 파일 지정 → 해당 파일만 로드
    if (scope === 'file' && targetFiles.length > 0) {
      fullTexts = await loadSpecificFiles(targetFiles, assistantId, assistantFiles, sharedFiles);
    }
    // (B) 카테고리 지정 → 해당 카테고리 파일만 로드
    else if (scope === 'script') {
      const pool = assistantId && assistantScripts.length > 0 ? assistantScripts : allFiles;
      for (const f of pool) {
        const text = await getFullDocumentText(f, assistantId);
        if (text) fullTexts.push({ name: f, text });
      }
    } else if (scope === 'reference') {
      const pool = assistantId && assistantReferences.length > 0 ? assistantReferences : sharedFiles;
      for (const f of pool) {
        const text = await getFullDocumentText(f, assistantId);
        if (text) fullTexts.push({ name: f, text });
      }
    } else if (scope === 'shared') {
      for (const f of sharedFiles) {
        const text = await getFullDocumentText(f, null);
        if (text) fullTexts.push({ name: f, text });
      }
    } else if (scope === 'assistant') {
      for (const f of assistantFiles) {
        const text = await getFullDocumentText(f, assistantId);
        if (text) fullTexts.push({ name: f, text });
      }
    }
    // (C) 범위 미지정(all) → 기존 로직: docTypeHint 또는 전체
    else {
      const pool = assistantId && assistantFiles.length > 0
        ? (docTypeHint === 'reference' ? assistantReferences : (docTypeHint === 'script' ? assistantScripts : assistantFiles))
        : allFiles;
      for (const f of pool) {
        const text = await getFullDocumentText(f, assistantId);
        if (text) fullTexts.push({ name: f, text });
      }
    }

    // 보조 RAG 검색 (풀텍스트 로드한 파일과 다른 소스에서)
    const ragContext = await searchByVector(lastUserMessage, null, 'all', 5);

    return { fullTexts, ragContext };
  }

  switch (intent) {
    // ═══════════════ compare_scripts ═══════════════
    case 'compare_scripts': {
      console.log(`[Compare] 대본 비교 시작 | 파일: ${targetFiles.join(', ')}`);

      // 보조작가 활성 시: 보조작가 문서인지 검증
      let validatedFiles = targetFiles;
      if (assistantId && assistantFiles.length > 0) {
        validatedFiles = targetFiles.filter(f => assistantFiles.includes(f));
        if (validatedFiles.length < targetFiles.length) {
          console.log(`[Compare] ⚠️ 보조작가 문서 필터링: ${targetFiles.join(', ')} → ${validatedFiles.join(', ') || '없음'}`);
        }
      }

      let fullTexts: { name: string; text: string }[] = [];

      if (validatedFiles.length >= 2) {
        fullTexts = await loadSpecificFiles(validatedFiles.slice(0, 2), assistantId, assistantFiles, sharedFiles);
      }

      // 파일 부족 시 자동 선택
      if (fullTexts.length < 2) {
        const searchPool = assistantId && assistantFiles.length >= 2 ? assistantFiles : allFiles;
        console.log(`[Compare] 파일 자동 탐색... ${assistantId && assistantFiles.length >= 2 ? '보조작가 전용' : '전체'} 목록`);
        fullTexts = [];
        for (const fileName of searchPool.slice(0, 2)) {
          const text = await getFullDocumentText(fileName, assistantId);
          if (text) fullTexts.push({ name: fileName, text });
        }
      }

      if (fullTexts.length < 2) {
        systemPrompt = `${basePersona}
        사용자가 대본 비교를 요청했지만, 비교할 수 있는 대본이 2개 이상 업로드되어 있지 않습니다.
        현재 업로드된 문서: ${allFiles.join(', ') || '없음'}
        비교하려면 2개 이상의 대본을 업로드해달라고 안내하세요.`;
      } else {
        console.log(`[Compare] 비교 대상: ${fullTexts[0].name} (${fullTexts[0].text.length}자) vs ${fullTexts[1].name} (${fullTexts[1].text.length}자)`);

        systemPrompt = `${basePersona}
        당신은 대본 비교 전문가입니다.
        아래 두 대본의 **전체 텍스트**가 제공됩니다. 처음부터 끝까지 꼼꼼히 읽고 비교 분석하세요.

        ## 비교 분석 지침
        1. **장면(S#) 단위로** 순서대로 비교하세요
        2. **추가된 장면**: 한쪽에만 있는 새로운 장면
        3. **삭제된 장면**: 이전 버전에 있었지만 삭제된 장면
        4. **수정된 대사**: 문장, 조사, 단어 하나라도 달라진 부분을 찾으세요
        5. **수정된 지문**: 행동, 표정, 장소 설명의 변경
        6. **구조적 변경**: 장면 순서 변경, 통합, 분리
        7. 각 변경에 대해 **작가의 의도**를 추론하세요

        ## 출력 형식
        - 변경 사항을 장면 순서대로 정리
        - 각 변경마다 변경 전/후를 인용하여 비교
        - 마지막에 전체 변경의 방향성과 의미를 요약

        ---
        ## 📄 대본 A: ${fullTexts[0].name}
        ${fullTexts[0].text}

        ---
        ## 📄 대본 B: ${fullTexts[1].name}
        ${fullTexts[1].text}`;
      }
      break;
    }

    // ═══════════════ analyze_script ═══════════════
    case 'analyze_script': {
      // ★ Phase 4: 파일 지정 시 해당 파일만 로드
      const { fullTexts: scriptFullTexts, ragContext: sharedScriptContext } = await loadContextByScope('script');

      if (scriptFullTexts.length > 0) {
        const allScriptText = scriptFullTexts
          .map(s => `=== 📜 ${s.name} (${s.text.length}자) ===\n${s.text}`)
          .join('\n\n---\n\n');

        console.log(`[Analyze Script] ${scope === 'file' ? '지정 파일' : '전체'} 대본 ${scriptFullTexts.length}개 로드 (총 ${allScriptText.length}자)`);

        systemPrompt = `${basePersona}
        당신은 대본/시나리오 전문 분석가입니다.
        사용자가 요청한 대본 분석을 수행하세요.

        중요: 아래에 대본의 **전체 텍스트**가 제공됩니다.
        처음부터 끝까지 꼼꼼히 읽고, 사용자의 질문에 맞는 정확한 분석을 제공하세요.
        대본의 일부만 보고 답변하지 마세요.
        [공유 참고 자료]가 있다면 배경 지식으로 보조적으로 활용하세요.

        분석 시 다음 관점들을 고려하세요:
        - 서사 구조 (3막 구조, 미드포인트, 시퀀스 분석)
        - 캐릭터 아크 (변화, 성장, 결핍과 극복)
        - 갈등 구조 (내적/외적 갈등, 대립 관계)
        - 대사 분석 (서브텍스트, 캐릭터성 반영)
        - 장면 전환 및 리듬

        [전체 대본]
        ${allScriptText}

        [공유 참고 자료]
        ${sharedScriptContext || '없음'}`;
      } else {
        // 대본 없으면 RAG 폴백
        const scriptContext = await searchByVector(lastUserMessage, assistantId, 'script', 20);
        systemPrompt = `${basePersona}
        사용자가 대본 분석을 요청했지만, 업로드된 대본을 찾을 수 없습니다.
        사용 가능한 참고 자료를 기반으로 최선의 답변을 제공하세요.

        [참고 자료]
        ${scriptContext || '검색 결과 없음'}`;
      }
      break;
    }

    // ═══════════════ analyze_reference ═══════════════
    case 'analyze_reference': {
      // ★ Phase 4: 파일 지정 시 해당 파일만 로드
      const { fullTexts: refFullTexts, ragContext: sharedRefContext } = await loadContextByScope('reference');

      // 폴백: reference가 없으면 공유 파일에서
      let finalRefTexts = refFullTexts;
      if (finalRefTexts.length === 0 && scope === 'all') {
        for (const fileName of sharedFiles.slice(0, 5)) {
          const text = await getFullDocumentText(fileName, null);
          if (text) finalRefTexts.push({ name: fileName, text });
        }
      }

      if (finalRefTexts.length > 0) {
        const allRefText = finalRefTexts
          .map(s => `=== 📚 ${s.name} (${s.text.length}자) ===\n${s.text}`)
          .join('\n\n---\n\n');

        console.log(`[Analyze Ref] ${scope === 'file' ? '지정 파일' : '전체'} 자료 ${finalRefTexts.length}개 로드 (총 ${allRefText.length}자)`);

        systemPrompt = `${basePersona}
        사용자가 업로드한 참고자료를 기반으로 답변하세요.

        중요: 아래에 참고자료의 **전체 텍스트**가 제공됩니다.
        처음부터 끝까지 읽고, 사용자의 질문에 정확히 답변하세요.
        [공유 참고 자료]가 있다면 보조적으로 활용하세요.

        참고자료 분석 시 다음을 수행하세요:
        - 자료의 핵심 내용을 정확히 파악하고 전달
        - 사용자의 질문에 맞는 정보를 자료에서 추출
        - 필요시 요약, 정리, 비교 분석 수행
        - 자료의 출처와 맥락을 명시

        [전체 참고 자료]
        ${allRefText}

        [공유 참고 자료]
        ${sharedRefContext || '없음'}`;
      } else {
        const refContext = await searchByVector(lastUserMessage, assistantId, 'reference', 15);
        systemPrompt = `${basePersona}
        사용자가 자료 분석을 요청했지만, 업로드된 참고자료를 찾을 수 없습니다.
        사용 가능한 정보를 기반으로 최선의 답변을 제공하세요.

        [참고 자료]
        ${refContext || '검색 결과 없음'}`;
      }
      break;
    }

    // ═══════════════ analyze_attachment ═══════════════
    case 'analyze_attachment': {
      let attAssistantContext = '';
      if (assistantId && assistantFiles.length > 0) {
        const scriptFullTexts: { name: string; text: string }[] = [];
        for (const fileName of assistantFiles) {
          const text = await getFullDocumentText(fileName, assistantId);
          if (text) scriptFullTexts.push({ name: fileName, text });
        }
        if (scriptFullTexts.length > 0) {
          attAssistantContext = scriptFullTexts
            .map(s => `=== 📜 ${s.name} ===\n${s.text}`)
            .join('\n\n---\n\n');
        }
      }

      const sharedAttContext = await searchByVector(lastUserMessage, null, 'all', 5);

      console.log(`[Analyze Attachment] 첨부 파일 분석 | 질문: "${lastUserMessage.substring(0, 50)}..." | 첨부 텍스트: ${attachmentText.length}자 | 전용 대본: ${attAssistantContext ? `${attAssistantContext.length}자` : '없음'}`);

      systemPrompt = `${basePersona}
      사용자가 채팅에서 직접 파일을 첨부하여 질문했습니다.
      사용자 메시지에 첨부된 파일의 전체 텍스트가 포함되어 있습니다.

      답변 시 다음 3가지 자료를 모두 활용하세요:
      1. **[전용 대본/자료]**: 보조작가 전용으로 학습된 대본 전체 (가장 중요한 기반 자료)
      2. **[채팅 첨부 파일]**: 사용자가 이번 메시지에 직접 첨부한 파일 (사용자 메시지에 포함됨)
      3. **[공유 참고 자료]**: 공유 학습자료에서 관련 부분 (보조 참고용)

      전용 대본/자료를 주요 기반으로 삼고, 첨부 파일과 공유 자료를 보조적으로 참고하여
      사용자의 질문에 정확하고 풍부한 답변을 제공하세요.

      분석 시 다음을 고려하세요:
      - 파일이 대본/시나리오인 경우: 서사 구조, 캐릭터 아크, 갈등 구조, 대사 분석
      - 파일이 참고자료인 경우: 핵심 내용 파악, 정보 추출, 요약
      - 전용 대본과 첨부 파일 간 연관성이 있다면 연결하여 분석

      ${attAssistantContext ? `[전용 대본/자료]\n${attAssistantContext}` : '[전용 대본/자료]\n없음'}

      [공유 참고 자료]
      ${sharedAttContext || '없음'}`;
      break;
    }

    // ═══════════════ analyze (사용자 작성 텍스트) ═══════════════
    case 'analyze': {
      const sharedAnalyzeContext = await searchByVector(lastUserMessage, null, 'all', 5);

      systemPrompt = `${basePersona}
      사용자가 제공한 대본, 스토리, 캐릭터 설정을 분석하여 구조적 결함을 짚어내고
      밀도 높은 전문가적 피드백과 대안을 제시하세요. 분석은 냉정하지만 말투는 건설적이어야 합니다.
      [공유 참고 자료]가 있다면 기존 작품/자료와 대조하여 더 풍부한 피드백을 제공하세요.

      [공유 참고 자료]
      ${sharedAnalyzeContext || '없음'}`;
      break;
    }

    // ═══════════════ search ═══════════════
    case 'search': {
      // ★ Phase 4: scope/files에 따라 선택적 로드
      if (scope === 'file' && targetFiles.length > 0) {
        // (A) 특정 파일 지정 → 해당 파일만 풀텍스트
        const specificTexts = await loadSpecificFiles(targetFiles, assistantId, assistantFiles, sharedFiles);
        if (specificTexts.length > 0) {
          const fileText = specificTexts
            .map(s => `=== 📜 ${s.name} ===\n${s.text}`)
            .join('\n\n---\n\n');
          const supplementary = await searchByVector(lastUserMessage, null, 'all', 5);

          console.log(`[Search] 지정 파일 ${specificTexts.length}개 로드 (${specificTexts.map(s => s.name).join(', ')})`);

          systemPrompt = `${basePersona}
          사용자가 특정 파일을 지정하여 질문했습니다.
          아래 제공된 파일의 전체 내용을 바탕으로 정확하게 답변하세요.
          파일에 없는 내용이라면 그 사실을 명확히 밝히세요.

          [지정 파일]
          ${fileText}

          [보조 참고 자료]
          ${supplementary || '없음'}`;
          break;
        }
      }

      // (B) 보조작가 활성 + 문서 있음 → 전체 로드 (기존 로직)
      if (assistantId && assistantFiles.length > 0) {
        // scope에 따라 로드 대상 결정
        let pool = assistantFiles;
        if (scope === 'script') pool = assistantScripts;
        else if (scope === 'reference') pool = assistantReferences;

        const scriptFullTexts: { name: string; text: string }[] = [];
        for (const fileName of pool) {
          const text = await getFullDocumentText(fileName, assistantId);
          if (text) scriptFullTexts.push({ name: fileName, text });
        }

        if (scriptFullTexts.length > 0) {
          const allScriptText = scriptFullTexts
            .map(s => `=== 📜 ${s.name} ===\n${s.text}`)
            .join('\n\n---\n\n');

          const sharedContext = await searchByVector(lastUserMessage, null, 'all', 5);

          console.log(`[Search+FullText] 전용 ${scope !== 'all' ? `(${scope})` : ''} ${scriptFullTexts.length}개 로드 (총 ${allScriptText.length}자)`);

          systemPrompt = `${basePersona}
          당신은 아래 제공된 전용 대본/자료의 전체 내용을 완벽히 숙지하고 있습니다.
          사용자의 질문에 대해 전용 대본/자료를 주요 근거로 정확하고 구체적으로 답변하세요.
          캐릭터 이름, 관계, 대사, 장면 등 세부 정보도 정확히 답변할 수 있어야 합니다.
          [공유 참고 자료]가 있다면 보조적으로 활용하여 답변을 풍부하게 하세요.
          대본/자료에 없는 내용이라면, 그 사실을 명확히 밝히세요.

          [전체 대본/자료]
          ${allScriptText}

          [공유 참고 자료]
          ${sharedContext || '없음'}`;
          break;
        }
      }

      // (C) 보조작가 비활성 또는 문서 없음 → 벡터 검색
      const sourceFileFilter = scope === 'file' && targetFiles.length > 0 ? targetFiles[0] : null;
      const docTypeForSearch = scope === 'script' ? 'script' : scope === 'reference' ? 'reference' : 'all';
      const retrievedContext = await searchByVector(lastUserMessage, assistantId, docTypeForSearch as any, 10, sourceFileFilter);

      systemPrompt = `${basePersona}
      사용자의 질문에 대해 하단의 [참고 자료]를 바탕으로 정확히 답변해주세요.
      [참고 자료]에서 찾은 내용이 있다면 반드시 그것을 기반으로 답변하세요.
      [참고 자료]에 질문과 직접적으로 관련된 내용이 없다면, 그 사실을 언급하고 당신이 가진 일반 지식으로 보충하세요.

      [참고 자료]
      ${retrievedContext ? retrievedContext : '검색 결과 없음'}`;
      break;
    }

    // ═══════════════ conversation ═══════════════
    case 'conversation':
    default: {
      // ★ Phase 4: conversation에서는 벡터 검색만 (풀텍스트 로드 불필요)
      let conversationContext = '';
      if (assistantId) {
        conversationContext = await searchByVector(lastUserMessage, assistantId, 'all', 5);
      }
      const sharedConvContext = await searchByVector(lastUserMessage, null, 'all', 5);

      systemPrompt = `${basePersona}
      사용자의 창작 활동에 영감을 주고, 창작의 고통에 깊이 공감하며 응원과 정서적 지지를 제공하세요.
      ${conversationContext || sharedConvContext ? `\n관련 자료가 있다면 자연스럽게 활용하세요.\n\n[참고 자료]\n${conversationContext}\n${sharedConvContext}` : ''}`;
      break;
    }
  }

  // ────────── 4. Gemini 멀티턴 대화 ──────────
  const model = genAI.getGenerativeModel({
    model: targetModelName,
    systemInstruction: systemPrompt,
  });

  const chatHistory = messages.slice(0, -1).map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: chatHistory });

  const geminiMessage = hasAttachment ? rawLastMessage : lastUserMessage;
  const response = await chat.sendMessageStream(geminiMessage);
  const stream = GoogleGenerativeAIStream(response);

  return new StreamingTextResponse(stream);
}
