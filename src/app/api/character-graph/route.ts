import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const maxDuration = 300;

/**
 * 보조작가 대본에서 캐릭터 관계 데이터 추출
 * GET /api/character-graph?assistantId=xxx
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const assistantId = url.searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json({ error: '보조작가를 선택해주세요. (assistantId 필요)' }, { status: 400 });
    }

    // 1. 보조작가 정보 조회
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id, name, specialty')
      .eq('id', assistantId)
      .single();

    if (!assistant) {
      return NextResponse.json({ error: '보조작가를 찾을 수 없습니다.' }, { status: 404 });
    }

    console.log(`[CharGraph] ${assistant.name} 보조작가 대본에서 캐릭터 추출 시작`);

    // 2. 해당 보조작가의 대본(script) 문서 목록 조회
    const { data: docs } = await supabase
      .from('documents')
      .select('source_file, content')
      .eq('assistant_id', assistantId)
      .neq('doc_type', 'reference')
      .order('id', { ascending: true });

    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: `${assistant.name}에 업로드된 대본이 없습니다.` }, { status: 404 });
    }

    // 3. source_file별 그룹화 + 최신 버전 필터링
    const fileGroups = new Map<string, { sourceFile: string; chunks: string[] }>();
    for (const doc of docs) {
      if (!fileGroups.has(doc.source_file)) {
        fileGroups.set(doc.source_file, { sourceFile: doc.source_file, chunks: [] });
      }
      fileGroups.get(doc.source_file)!.chunks.push(doc.content);
    }

    // 화별 최신 버전 필터링 (예: 대본_블랙위도우1화_V4.8.pdf, V4.9.pdf → V4.9만 선택)
    const episodeMap = new Map<string, { sourceFile: string; version: number; chunks: string[] }>();
    for (const [sourceFile, group] of fileGroups) {
      // 화번호 추출 시도 (예: "1화", "2회", "1부", "ep1" 등)
      const epMatch = sourceFile.match(/(\d+)\s*[화회부]|ep\s*(\d+)/i);
      const epNum = epMatch ? (epMatch[1] || epMatch[2]) : sourceFile;

      // 버전 추출 시도 (예: "V4.9", "v2.1" 등)
      const verMatch = sourceFile.match(/[vV](\d+\.?\d*)/);
      const version = verMatch ? parseFloat(verMatch[1]) : 0;

      const existing = episodeMap.get(epNum);
      if (!existing || version > existing.version) {
        episodeMap.set(epNum, { sourceFile, version, chunks: group.chunks });
      }
    }

    // 4. 선택된 대본 전체 텍스트 합산
    const scriptTexts: { episode: string; fileName: string; text: string }[] = [];
    for (const [ep, data] of episodeMap) {
      const fullText = data.chunks.join('\n');
      scriptTexts.push({ episode: ep, fileName: data.sourceFile, text: fullText });
      console.log(`[CharGraph] ${data.sourceFile}: ${data.chunks.length}개 청크, ${fullText.length}자`);
    }

    // 5. Gemini AI로 캐릭터/관계 추출
    const combinedText = scriptTexts
      .map(s => `=== ${s.fileName} ===\n${s.text.slice(0, 30000)}`)
      .join('\n\n');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const extractionPrompt = `
    다음은 드라마/시나리오 대본입니다. 이 대본에서 모든 등장인물과 그들 간의 관계를 분석해주세요.

    분석 규칙:
    1. 명확하게 등장하는 캐릭터만 포함 (배경 엑스트라 제외)
    2. 관계는 양방향으로 한 번만 기술
    3. role은 다음 중 하나: "주인공", "조연", "적대자", "조력자", "기타"
    4. relationship type은 다음 중 하나: "가족", "연인", "친구", "동료", "적대", "상사/부하", "스승/제자", "기타"
    5. weight는 1-5 (1=약한 관계, 5=핵심 관계)
    6. description은 한국어로 간결하게

    응답 형식 (JSON):
    {
      "characters": [
        {
          "name": "캐릭터 이름",
          "role": "주인공",
          "description": "캐릭터 한 줄 설명",
          "episodes": [1, 2, 3, 4]
        }
      ],
      "relationships": [
        {
          "from": "캐릭터A 이름",
          "to": "캐릭터B 이름",
          "type": "연인",
          "description": "관계 설명",
          "weight": 5
        }
      ]
    }

    대본:
    ${combinedText}
    `;

    console.log(`[CharGraph] Gemini AI에 캐릭터 추출 요청 (${combinedText.length}자)`);
    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text();
    const extracted = JSON.parse(responseText);

    console.log(`[CharGraph] 추출 완료: ${extracted.characters?.length || 0}명, ${extracted.relationships?.length || 0}개 관계`);

    // 6. GraphNode/GraphEdge 형태로 변환
    const ROLE_COLORS: Record<string, string> = {
      '주인공': '#f43f5e',
      '조연': '#6366f1',
      '적대자': '#ef4444',
      '조력자': '#22c55e',
      '기타': '#94a3b8',
    };

    const RELATION_COLORS: Record<string, string> = {
      '가족': '#22c55e',
      '연인': '#ec4899',
      '친구': '#3b82f6',
      '동료': '#6366f1',
      '적대': '#ef4444',
      '상사/부하': '#f97316',
      '스승/제자': '#8b5cf6',
      '기타': '#94a3b8',
    };

    const nodes = (extracted.characters || []).map((c: any) => ({
      id: c.name,
      label: c.name,
      role: c.role || '기타',
      description: c.description || '',
      episodes: c.episodes || [],
      color: ROLE_COLORS[c.role] || ROLE_COLORS['기타'],
      size: 16 + (c.episodes?.length || 1) * 4,
    }));

    const edges = (extracted.relationships || []).map((r: any) => ({
      source: r.from,
      target: r.to,
      type: r.type || '기타',
      description: r.description || '',
      weight: r.weight || 1,
      color: RELATION_COLORS[r.type] || RELATION_COLORS['기타'],
    }));

    // Chord 다이어그램용 매트릭스 생성 (N x N, 씬 교차 기반 관계량)
    const charNames = nodes.map((n: any) => n.label);
    const n = charNames.length;
    const chordMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (const r of extracted.relationships || []) {
      const i = charNames.indexOf(r.from);
      const j = charNames.indexOf(r.to);
      if (i >= 0 && j >= 0) {
        const val = (r.weight || 1) * 5; // weight → 관계량 스케일링
        chordMatrix[i][j] = val;
        chordMatrix[j][i] = val; // 대칭
      }
    }

    // AI 인사이트 생성
    let insights: string[] = [];
    try {
      const insightPrompt = `
다음은 드라마 캐릭터 관계 분석 결과입니다. 작가에게 유용한 인사이트를 3~5개 제공해주세요.

캐릭터: ${charNames.join(', ')}
관계:
${(extracted.relationships || []).map((r: any) => `- ${r.from} ↔ ${r.to}: ${r.type} (강도 ${r.weight}/5) - ${r.description}`).join('\n')}

규칙:
1. 각 인사이트는 1~2문장으로 간결하게
2. 구조적 특이점, 고립된 인물, 관계 밀집도 등을 분석
3. 작가에게 스토리 개선 힌트가 되는 내용
4. 한국어로 작성

응답 형식 (JSON):
{ "insights": ["인사이트1", "인사이트2", ...] }`;

      const insightResult = await model.generateContent(insightPrompt);
      const insightParsed = JSON.parse(insightResult.response.text());
      insights = insightParsed.insights || [];
    } catch (e) {
      console.error('[CharGraph] 인사이트 생성 실패:', e);
      insights = [];
    }

    return NextResponse.json({
      assistant: { name: assistant.name, specialty: assistant.specialty },
      scripts: scriptTexts.map(s => ({ episode: s.episode, fileName: s.fileName, length: s.text.length })),
      nodes,
      edges,
      chord: {
        keys: charNames,
        matrix: chordMatrix,
        roles: nodes.map((n: any) => n.role),
        colors: nodes.map((n: any) => n.color),
      },
      insights,
      stats: {
        totalCharacters: nodes.length,
        totalRelationships: edges.length,
        analyzedScripts: scriptTexts.length,
      },
    });
  } catch (err: any) {
    console.error('[CharGraph Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
