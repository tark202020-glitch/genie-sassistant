// 글 종류 — 단계 1 text_type의 표시용 헬퍼 (실행 목록·실행 상세가 공유)

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
