// 글 종류 — 단계 1 text_type 헬퍼. 표시용(실행 목록·실행 상세)과 파이프라인용(작가 지정 적용)을 함께 둔다 (외부 의존 없는 순수 함수)

export interface TextTypeInfo {
  /** 분석에 적용된 종류 — 작가 지정이면 지정값 */
  type?: string;
  /** 작가 지정일 때 모델의 원래 판별 */
  detected?: string;
  decided_by?: 'auto' | 'author';
  /** 적합 비중(%) — FA-0.20부터 */
  fit?: { fiction?: number; essay?: number; other?: number };
  other_label?: string;
  basis?: string;
}

export const TEXT_TYPE_LABEL: Record<string, string> = { fiction: '소설', essay: '에세이·실용서', other: '기타' };
export const TEXT_TYPE_COLOR: Record<string, string> = { fiction: '#4f46e5', essay: '#0d9488', other: '#94a3b8' };

/** 적합 비중을 합계 100%로 정규화한다 — 모델이 합을 100으로 못 맞춘 경우 대비. 비중이 없으면 null */
export function fitPercents(tt?: TextTypeInfo | null): { fiction: number; essay: number; other: number } | null {
  const f = tt?.fit;
  if (!f) return null;
  const raw = { fiction: Number(f.fiction) || 0, essay: Number(f.essay) || 0, other: Number(f.other) || 0 };
  const total = raw.fiction + raw.essay + raw.other;
  if (total <= 0) return null;
  const fiction = Math.round((raw.fiction / total) * 100);
  const essay = Math.round((raw.essay / total) * 100);
  return { fiction, essay, other: Math.max(0, 100 - fiction - essay) };
}

// ── 파이프라인용 ──

/** 작가가 지정한 글 종류 — 실행 설정(versions.text_type_choice). 자동 판별이면 null */
export function textTypeChoiceOf(versions: any): 'fiction' | 'essay' | null {
  const c = versions?.text_type_choice;
  return c === 'fiction' || c === 'essay' ? c : null;
}

/**
 * 단계 1의 text_type에 결정 방식을 기록한다. 작가 지정이면 type을 지정값으로 고정하고 모델 판별은 detected에 남긴다.
 * 이후 단계의 프롬프트와 규칙 필터(rulesForTextType)는 모두 이 type을 따른다.
 */
export function applyTextTypeChoice(output: any, choice: 'fiction' | 'essay' | null) {
  const tt = output.text_type ?? {};
  output.text_type = choice
    ? { ...tt, detected: tt.type, type: choice, decided_by: 'author' }
    : { ...tt, decided_by: 'auto' };
}

/**
 * 작가 지정 실행이면 이후 단계 프롬프트에는 지정값만 넘긴다.
 * 자동 판별(detected·fit·basis)이 함께 보이면 모델이 그쪽으로 분기한다 — 실측: 소설 지정인데 단계 4가 에세이 규칙으로 점검
 */
export function priorForPrompt(prior: Record<string, unknown>): Record<string, unknown> {
  const s1 = prior['1'] as any;
  if (s1?.text_type?.decided_by !== 'author') return prior;
  return { ...prior, '1': { ...s1, text_type: { type: s1.text_type.type, decided_by: 'author' } } };
}
