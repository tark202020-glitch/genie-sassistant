// 피드백 랩 — 파이프라인 오케스트레이션 (분할 실행: advance 1회 = 단계 1개 = Gemini 1회)
import { GoogleGenerativeAI } from '@google/generative-ai';
import { labDb as supabase } from '@/lib/lab/db';
import { buildStepPrompt } from './prompts';
import { rulesForMode } from './rules';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export type LabMode = 'I' | 'D' | 'R' | 'F';

export const LAB_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;
export type LabModel = (typeof LAB_MODELS)[number];
export const DEFAULT_LAB_MODEL: LabModel = 'gemini-2.5-flash';

/** 모드별 실행 단계 (설계문서 v0.2 §6-2). R의 diff·증분은 2차 — 1차는 D와 동일 집합으로 실행 */
export function stepsForMode(mode: LabMode, hasSynopsis: boolean): string[] {
  const base: Record<LabMode, string[]> = {
    I: ['1', '5', '6'],
    D: ['0.5', '1', '2', '3', '4', '5', '6'],
    R: ['0.5', '1', '2', '3', '4', '5', '6'],
    F: ['1', '4', '6'],
  };
  return base[mode].filter((s) => s !== '0.5' || hasSynopsis);
}

/** 원고에 인용이 실제로 존재하는지 검사 (근거 유효율 지표의 원천) */
function validateEvidence(payload: any, manuscript: string): { total: number; valid: number } {
  const norm = (s: string) => s.replace(/\s+/g, '');
  const m = norm(manuscript);
  let total = 0;
  let valid = 0;
  const walk = (node: any) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (typeof node.quote === 'string' && node.quote.trim()) {
        total += 1;
        const q = norm(node.quote);
        // 짧은 인용은 그대로, 긴 인용은 앞 40자만으로도 존재 확인 (띄어쓰기 차이 허용)
        if (m.includes(q) || (q.length > 40 && m.includes(q.slice(0, 40)))) {
          valid += 1;
          node._evidence_valid = true;
        } else {
          node._evidence_valid = false;
        }
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(payload);
  return { total, valid };
}

/** 모델이 최상위 배열로 응답하는 경우 단계별 기본 키로 감싼다 (실측: 단계 4가 issues 배열만 반환) */
function normalizeOutput(step: string, parsed: any): any {
  if (!Array.isArray(parsed)) return parsed;
  const rootKey: Record<string, string> = {
    '0.5': 'divergences',
    '1': 'scenes',
    '3': 'strengths',
    '4': 'issues',
    '5': 'questions',
    '6': 'a_grade',
  };
  return { [rootKey[step] ?? 'items']: parsed };
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // 코드펜스·앞뒤 잡음 제거 후 재시도
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('JSON 파싱 실패');
  }
}

/** 단계 산출물 → 판정 대상 항목(lab_items) 추출 */
function extractItems(step: string, output: any): { item_type: string; payload: any }[] {
  const items: { item_type: string; payload: any }[] = [];
  if (step === '3') {
    for (const s of output.strengths ?? []) items.push({ item_type: 'strength', payload: s });
  } else if (step === '4') {
    for (const i of output.issues ?? []) items.push({ item_type: 'issue', payload: i });
    for (const e of output.line_edits ?? []) items.push({ item_type: 'line_edit', payload: e });
  } else if (step === '5') {
    for (const q of output.questions ?? []) {
      if (!q.resolved_in_manuscript) items.push({ item_type: 'question', payload: q });
    }
  } else if (step === '6') {
    for (const s of output.setting_diff ?? []) items.push({ item_type: 'setting', payload: s });
  }
  return items;
}

export interface AdvanceResult {
  done: boolean;
  step?: string;
  stepStatus?: string;
  remaining?: number;
  error?: string;
  /** 직전 시도가 완료되지 못한 단계(서버 시간 한도 초과 등)를 다시 집었음 */
  resumed?: boolean;
}

/** 다음 pending 단계 하나를 실행한다. 멱등: running인 단계가 있으면 그 단계를 재실행 */
export async function advanceRun(runId: string): Promise<AdvanceResult> {
  let { data: run, error: runErr } = await supabase
    .from('lab_runs')
    .select('id, mode, synopsis, status, versions, metrics, manuscript_id, lab_manuscripts(content, author_context)')
    .eq('id', runId)
    .single();
  // author_context 컬럼 마이그레이션(lab_02) 이전 환경 폴백
  if (runErr) {
    const fallback = await supabase
      .from('lab_runs')
      .select('id, mode, synopsis, status, versions, metrics, manuscript_id, lab_manuscripts(content)')
      .eq('id', runId)
      .single();
    run = fallback.data as any;
    runErr = fallback.error;
  }
  if (runErr || !run) return { done: true, error: '실행을 찾을 수 없습니다.' };

  const modelName: string =
    (run.versions as any)?.model && LAB_MODELS.includes((run.versions as any).model)
      ? (run.versions as any).model
      : DEFAULT_LAB_MODEL;

  const manuscript: string = (run as any).lab_manuscripts?.content ?? '';
  const authorContext: string | null = (run as any).lab_manuscripts?.author_context ?? null;
  const order = stepsForMode(run.mode as LabMode, !!run.synopsis);

  const { data: steps } = await supabase
    .from('lab_run_steps')
    .select('step, status, output')
    .eq('run_id', runId);
  const stepMap = new Map((steps ?? []).map((s) => [s.step, s]));

  const next = order.find((s) => {
    const st = stepMap.get(s)?.status;
    return st !== 'done' && st !== 'skipped';
  });

  if (!next) {
    await supabase
      .from('lab_runs')
      .update({ status: 'done', finished_at: new Date().toISOString() })
      .eq('id', runId);
    return { done: true, remaining: 0 };
  }

  // 이미 running인 단계를 다시 집는다 = 직전 호출이 끝을 못 봄 (Vercel 함수 시간 한도 300초 초과 가능성)
  const interrupted = stepMap.get(next)?.status === 'running';
  await supabase
    .from('lab_run_steps')
    .upsert(
      {
        run_id: runId,
        step: next,
        status: 'running',
        error: interrupted
          ? '⏱ 직전 시도가 완료되지 못했습니다 (서버 처리 시간 한도 300초 초과 가능성). 이 단계를 처음부터 다시 실행합니다.'
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'run_id,step' }
    );
  await supabase.from('lab_runs').update({ status: 'running' }).eq('id', runId);

  try {
    // 이전 단계 산출물 수집
    const prior: Record<string, unknown> = {};
    for (const s of order) {
      if (s === next) break;
      const row = stepMap.get(s);
      if (row?.output) prior[s] = row.output;
    }

    const prompt = buildStepPrompt(next, {
      manuscript,
      synopsis: run.synopsis,
      authorContext,
      mode: run.mode,
      prior,
      rules: rulesForMode(run.mode as LabMode),
    });

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 },
    });

    // 생성 JSON이 깨지는 경우가 있어(인용문 내 따옴표 등) 파싱 실패 시 재생성
    // 토큰 사용량은 재시도 포함 전부 합산한다 (실제 과금 기준)
    let output: any = null;
    let lastParseError: Error | null = null;
    const used = { prompt: 0, output: 0, total: 0 };
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await model.generateContent(prompt);
      const u: any = result.response.usageMetadata ?? {};
      used.prompt += u.promptTokenCount ?? 0;
      used.output += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
      used.total += u.totalTokenCount ?? 0;
      try {
        output = normalizeOutput(next, parseJson(result.response.text()));
        break;
      } catch (e: any) {
        lastParseError = e;
        console.warn(`[lab] 단계 ${next} JSON 파싱 실패 (시도 ${attempt + 1}/3):`, e.message);
      }
    }
    if (!output) throw lastParseError ?? new Error('JSON 파싱 실패');
    output._usage = used;

    const ev = validateEvidence(output, manuscript);
    output._evidence_stats = ev;

    await supabase
      .from('lab_run_steps')
      .update({ status: 'done', output, error: null, updated_at: new Date().toISOString() })
      .eq('run_id', runId)
      .eq('step', next);

    // 판정 대상 항목 추출 (멱등: 해당 run+step 기존 항목 삭제 후 삽입)
    const items = extractItems(next, output);
    if (items.length > 0) {
      await supabase.from('lab_items').delete().eq('run_id', runId).eq('step', next);
      const { error: itemsError } = await supabase
        .from('lab_items')
        .insert(items.map((it) => ({ run_id: runId, step: next, ...it })));
      // 삽입 실패를 무시하면 판정 불가 상태가 조용히 지나간다 (실측: item_type CHECK 제약 누락)
      if (itemsError) throw new Error(`판정 항목 저장 실패: ${itemsError.message}`);
    }

    const remaining = order.filter((s) => {
      const st = s === next ? 'done' : stepMap.get(s)?.status;
      return st !== 'done' && st !== 'skipped';
    }).length;

    // 실행 누적 토큰 갱신 (metrics.tokens)
    const prevMetrics = (run.metrics as any) ?? {};
    const prev = prevMetrics.tokens ?? { prompt: 0, output: 0, total: 0 };
    const tokens = {
      prompt: prev.prompt + used.prompt,
      output: prev.output + used.output,
      total: prev.total + used.total,
    };
    await supabase
      .from('lab_runs')
      .update({
        metrics: { ...prevMetrics, tokens },
        ...(remaining === 0 ? { status: 'done', finished_at: new Date().toISOString() } : {}),
      })
      .eq('id', runId);
    run.metrics = { ...prevMetrics, tokens } as any;

    return { done: remaining === 0, step: next, stepStatus: 'done', remaining, resumed: interrupted };
  } catch (err: any) {
    const message = err?.message || '단계 실행 실패';
    await supabase
      .from('lab_run_steps')
      .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
      .eq('run_id', runId)
      .eq('step', next);
    await supabase.from('lab_runs').update({ status: 'failed' }).eq('id', runId);
    return { done: false, step: next, stepStatus: 'failed', error: message };
  }
}
