import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SETTING_TYPE_COLORS,
  SETTING_RELATION_COLORS,
} from '@/types/script-organizer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const maxDuration = 300;

// 대본 로딩 + 화별 그룹핑 (character-graph와 동일 로직)
async function loadScripts(assistantId: string) {
  const { data: assistant } = await supabase
    .from('assistants')
    .select('id, name, specialty')
    .eq('id', assistantId)
    .single();

  if (!assistant) throw new Error('보조작가를 찾을 수 없습니다.');

  const { data: docs } = await supabase
    .from('documents')
    .select('source_file, content')
    .eq('assistant_id', assistantId)
    .neq('doc_type', 'reference')
    .order('id', { ascending: true });

  if (!docs || docs.length === 0) {
    throw new Error(`${assistant.name}에 업로드된 대본이 없습니다.`);
  }

  // source_file별 그룹화
  const fileGroups = new Map<string, string[]>();
  for (const doc of docs) {
    if (!fileGroups.has(doc.source_file)) fileGroups.set(doc.source_file, []);
    fileGroups.get(doc.source_file)!.push(doc.content);
  }

  // 화별 최신 버전 필터
  const episodeMap = new Map<string, { sourceFile: string; version: number; chunks: string[] }>();
  for (const [sourceFile, chunks] of fileGroups) {
    const epMatch = sourceFile.match(/(\d+)\s*[화회부]|ep\s*(\d+)/i);
    const epNum = epMatch ? (epMatch[1] || epMatch[2]) : sourceFile;
    const verMatch = sourceFile.match(/[vV](\d+\.?\d*)/);
    const version = verMatch ? parseFloat(verMatch[1]) : 0;

    const existing = episodeMap.get(epNum);
    if (!existing || version > existing.version) {
      episodeMap.set(epNum, { sourceFile, version, chunks });
    }
  }

  const scripts = Array.from(episodeMap.entries()).map(([ep, data]) => ({
    episode: ep,
    fileName: data.sourceFile,
    text: data.chunks.join('\n'),
  }));

  return { assistant, scripts };
}

export async function POST(req: Request) {
  try {
    const { assistantId, analysisType } = await req.json();

    if (!assistantId) {
      return NextResponse.json({ error: 'assistantId가 필요합니다.' }, { status: 400 });
    }

    const { assistant, scripts } = await loadScripts(assistantId);
    console.log(`[ScriptOrganizer] ${assistant.name}: ${scripts.length}개 대본, 분석 유형: ${analysisType}`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (analysisType === 'settings') {
      // === 배경/공간 분석 ===
      const combinedText = scripts
        .map(s => `=== ${s.fileName} ===\n${s.text.slice(0, 30000)}`)
        .join('\n\n');

      const prompt = `다음은 드라마/시나리오 대본입니다. 이 대본에서 모든 배경(장소/공간)과 공간 간의 관계를 분석해주세요.

분석 규칙:
1. 씬 헤더(S#), 장소 지시문, 지문에서 장소를 추출
2. type은 다음 중 하나: "indoor", "outdoor", "vehicle", "virtual", "other"
3. relationship은 다음 중 하나: "contains" (A 안에 B), "adjacent" (A 옆에 B), "connected" (A와 B가 연결), "part_of" (B는 A의 일부), "opposite" (A와 B는 대비 공간)
4. frequency는 해당 장소가 등장하는 씬 수
5. episodes는 해당 장소가 등장하는 회차 번호 배열
6. 너무 세부적인 장소(예: "거실 소파")는 상위 장소(예: "거실")로 통합
7. 최소 2회 이상 등장하는 장소만 포함

응답 형식 (JSON):
{
  "locations": [
    { "name": "장소명", "type": "indoor", "description": "한 줄 설명", "episodes": [1,2], "frequency": 5 }
  ],
  "spatial_relationships": [
    { "from": "장소A", "to": "장소B", "relationship": "contains", "description": "관계 설명" }
  ]
}

대본:
${combinedText}`;

      const result = await model.generateContent(prompt);
      const extracted = JSON.parse(result.response.text());

      const nodes = (extracted.locations || []).map((loc: any) => ({
        id: loc.name,
        label: loc.name,
        type: loc.type || 'other',
        description: loc.description || '',
        episodes: loc.episodes || [],
        frequency: loc.frequency || 1,
        color: SETTING_TYPE_COLORS[loc.type] || SETTING_TYPE_COLORS.other,
        size: 14 + Math.min((loc.frequency || 1) * 3, 30),
      }));

      const edges = (extracted.spatial_relationships || []).map((rel: any) => ({
        source: rel.from,
        target: rel.to,
        relationship: rel.relationship || 'connected',
        description: rel.description || '',
        color: SETTING_RELATION_COLORS[rel.relationship] || SETTING_RELATION_COLORS.connected,
      }));

      const data = {
        nodes,
        edges,
        stats: {
          totalLocations: nodes.length,
          totalRelationships: edges.length,
          analyzedScripts: scripts.length,
        },
      };

      // 자동 저장
      await autoSave(assistantId, 'settings', data);

      return NextResponse.json({ success: true, data });

    } else if (analysisType === 'episodes') {
      // === 화별 요약 ===
      const summaries = [];

      for (const script of scripts) {
        console.log(`[ScriptOrganizer] ${script.fileName} 요약 생성 중...`);

        const prompt = `다음은 드라마 대본 한 회차(에피소드)입니다. 아래 항목들을 분석해주세요.

분석 항목:
1. plot_summary: 3-5문장으로 이 회차의 줄거리 요약
2. key_characters: 이 회차에 등장하는 주요 캐릭터 이름 배열 (최대 8명)
3. key_locations: 이 회차에 등장하는 주요 장소 배열 (최대 6개)
4. emotional_tone: 전체적인 분위기 (예: "긴장감", "감동", "코미디", "로맨스", "공포", "액션", "슬픔", "희망", "분노", "미스터리")
5. emotional_arc: 감정 흐름 (예: "평온 → 갈등 → 절정 → 해소")
6. key_events: 2-4개의 핵심 사건 배열

응답 형식 (JSON):
{
  "plot_summary": "...",
  "key_characters": [...],
  "key_locations": [...],
  "emotional_tone": "...",
  "emotional_arc": "...",
  "key_events": [...]
}

대본:
${script.text.slice(0, 50000)}`;

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());

        const epNum: number = parseInt(script.episode) || (summaries.length + 1);
        summaries.push({
          episode: epNum,
          fileName: script.fileName,
          plotSummary: parsed.plot_summary || '',
          keyCharacters: parsed.key_characters || [],
          keyLocations: parsed.key_locations || [],
          emotionalTone: parsed.emotional_tone || '',
          emotionalArc: parsed.emotional_arc || '',
          keyEvents: parsed.key_events || [],
        });
      }

      // 화번호로 정렬
      summaries.sort((a, b) => a.episode - b.episode);

      // 자동 저장
      await autoSave(assistantId, 'episodes', summaries);

      return NextResponse.json({ success: true, data: summaries });

    } else {
      return NextResponse.json({ error: '유효하지 않은 분석 유형입니다.' }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[ScriptOrganizer Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 자동 저장 헬퍼
async function autoSave(assistantId: string, analysisType: string, data: any) {
  try {
    const name = `자동 저장`;

    // 기존 자동 저장 데이터가 있으면 업데이트
    const { data: existing } = await supabase
      .from('script_analyses')
      .select('id')
      .eq('assistant_id', assistantId)
      .eq('analysis_type', analysisType)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('script_analyses')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('script_analyses')
        .insert({ assistant_id: assistantId, name, analysis_type: analysisType, data });
    }
    console.log(`[ScriptOrganizer] ${analysisType} 자동 저장 완료`);
  } catch (err: any) {
    console.error('[ScriptOrganizer] 자동 저장 실패:', err.message);
  }
}
