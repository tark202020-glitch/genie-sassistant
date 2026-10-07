// 피드백 랩 — 지표 계산 (설계문서 v0.2 §11-2의 6종 + 필수 케이스)
// Gemini 호출 없이 순수 함수로 동작한다 (fixture 단독 테스트 가능 — 개발 진행문서 §7)

export interface LabItemRow {
  id: string;
  item_type: string; // strength | issue | question | setting
  payload: any;
  verdict?: 'adopted' | 'rejected' | 'disputed' | null;
}

export interface GoldRow {
  item_type: string;
  payload: any;
}

export interface MetricResult {
  key: string;
  label: string;
  value: number | null; // 0~1, null = 계산 불가
  target: string;
  status: 'pass' | 'fail' | 'na';
  note: string;
}

export interface RequiredCaseResult {
  passed: boolean;
  applicable: boolean; // 골드 원고(『요리는 잘 하는 사람』)에만 적용
  label: string;
  detail: string;
}

/** loc 문자열("쪽 55-62", "60, 71")에서 쪽 번호 추출 */
export function extractPages(loc: unknown): number[] {
  if (typeof loc !== 'string') return [];
  return (loc.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n < 10000);
}

function pagesOverlap(a: number[], b: number[], tolerance = 3): boolean {
  return a.some((x) => b.some((y) => Math.abs(x - y) <= tolerance));
}

/** 한글 텍스트 2-gram 자카드 유사도 (제목·기제의 느슨한 매칭용) */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = (s || '').replace(/\s+/g, '');
    const set = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  ga.forEach((g) => {
    if (gb.has(g)) inter += 1;
  });
  return inter / (ga.size + gb.size - inter);
}

/** 필수 케이스: "편의점 장면을 R25 A급으로" (설계문서 §11-3 릴리즈 기준, 전체 1고 기준 쪽 55~75) */
const REQUIRED_CASE = { rule: 'R25', grade: 'A', pageMin: 55, pageMax: 75 };

export function computeMetrics(
  stepOutputs: Record<string, any>,
  items: LabItemRow[],
  gold: GoldRow[],
  manuscriptTitle?: string
): { metrics: MetricResult[]; requiredCase: RequiredCaseResult } {
  const metrics: MetricResult[] = [];

  const runIssues = items.filter((i) => i.item_type === 'issue').map((i) => i.payload);
  const runStrengths = items.filter((i) => i.item_type === 'strength').map((i) => i.payload);
  const goldIssues = gold.filter((g) => g.item_type === 'issue').map((g) => g.payload);
  const goldStrengths = gold.filter((g) => g.item_type === 'strength').map((g) => g.payload);
  const goldSettings = gold.filter((g) => g.item_type === 'setting').map((g) => g.payload);

  // 1) 근거 유효율 — 단계 산출물의 인용 자동 검증 합산 (목표 1.0)
  let evTotal = 0;
  let evValid = 0;
  for (const out of Object.values(stepOutputs)) {
    const ev = (out as any)?._evidence_stats;
    if (ev) {
      evTotal += ev.total ?? 0;
      evValid += ev.valid ?? 0;
    }
  }
  metrics.push({
    key: 'evidence',
    label: '근거 유효율 (인용이 실제 원고 문장)',
    value: evTotal > 0 ? evValid / evTotal : null,
    target: '= 1.0',
    status: evTotal === 0 ? 'na' : evValid === evTotal ? 'pass' : 'fail',
    note: evTotal > 0 ? `${evValid}/${evTotal}` : '인용 통계 없음 (집계 도입 전 실행)',
  });

  // 2) A급 일치 — 골드 A급을 에이전트도 A급으로 (rule_id 일치 + 쪽 ±3 겹침, 목표 ≥0.8)
  const goldA = goldIssues.filter((g) => g.grade === 'A');
  const runA = runIssues.filter((r) => r.grade === 'A');
  if (goldA.length === 0) {
    metrics.push({
      key: 'a_match', label: 'A급 일치', value: null, target: '≥ 0.8', status: 'na',
      note: '골드 A급 없음 — 판정 콘솔에서 A급 채택 또는 골드 임포트 필요',
    });
  } else {
    const hit = goldA.filter((g) =>
      runA.some((r) => r.rule_id === g.rule_id && pagesOverlap(extractPages(r.loc), extractPages(g.loc)))
    ).length;
    const v = hit / goldA.length;
    metrics.push({
      key: 'a_match', label: 'A급 일치', value: v, target: '≥ 0.8',
      status: v >= 0.8 ? 'pass' : 'fail', note: `${hit}/${goldA.length}`,
    });
  }

  // 3) 장점 재현 — 골드 장점 유형을 재현 (유형명+기제 유사도, 목표 ≥0.8)
  if (goldStrengths.length === 0) {
    metrics.push({
      key: 'strength_recall', label: '장점 재현', value: null, target: '≥ 0.8', status: 'na',
      note: '골드 장점 없음 — 판정 콘솔에서 장점 채택 필요',
    });
  } else {
    const hit = goldStrengths.filter((g) =>
      runStrengths.some(
        (r) =>
          similarity(`${g.type_name ?? ''}${g.mechanism ?? ''}`, `${r.type_name ?? ''}${r.mechanism ?? ''}`) >= 0.25
      )
    ).length;
    const v = hit / goldStrengths.length;
    metrics.push({
      key: 'strength_recall', label: '장점 재현', value: v, target: '≥ 0.8',
      status: v >= 0.8 ? 'pass' : 'fail', note: `${hit}/${goldStrengths.length} (유사도 매칭 — 근사치)`,
    });
  }

  // 4) 작가 대입 정밀도 — R17·R18 탐지 중 편집자 채택 (이 실행의 판정 기준, 목표 ≥0.75)
  const authorItems = items.filter(
    (i) => i.item_type === 'issue' && ['R17', 'R18'].includes(i.payload?.rule_id) && i.verdict && i.verdict !== 'disputed'
  );
  const adopted = authorItems.filter((i) => i.verdict === 'adopted').length;
  if (authorItems.length === 0) {
    metrics.push({
      key: 'author_precision', label: '작가 대입 정밀도 (R17·R18)', value: null, target: '≥ 0.75', status: 'na',
      note: '판정된 R17·R18 항목 없음 — 판정 콘솔에서 채택/기각 필요',
    });
  } else {
    const v = adopted / authorItems.length;
    metrics.push({
      key: 'author_precision', label: '작가 대입 정밀도 (R17·R18)', value: v, target: '≥ 0.75',
      status: v >= 0.75 ? 'pass' : 'fail', note: `${adopted}/${authorItems.length}`,
    });
  }

  // 5) 지식 상태 탐지 — 골드의 정보 설계(R25) A급을 A급으로 (목표: 일치)
  const goldR25A = goldA.filter((g) => g.rule_id === 'R25');
  if (goldR25A.length === 0) {
    metrics.push({
      key: 'knowledge', label: '지식 상태 탐지 (정보 설계 A급)', value: null, target: '일치', status: 'na',
      note: '골드에 R25 A급 없음',
    });
  } else {
    const hit = goldR25A.filter((g) =>
      runA.some((r) => r.rule_id === 'R25' && pagesOverlap(extractPages(r.loc), extractPages(g.loc)))
    ).length;
    metrics.push({
      key: 'knowledge', label: '지식 상태 탐지 (정보 설계 A급)', value: hit / goldR25A.length, target: '일치',
      status: hit === goldR25A.length ? 'pass' : 'fail', note: `${hit}/${goldR25A.length}`,
    });
  }

  // 6) 설정 충돌 재현 — 골드 설정 항목을 충돌·공백으로 냈는가 (목표 ≥0.8)
  const runSettings: any[] = [
    ...(stepOutputs['1']?.settings ?? []),
    ...items.filter((i) => i.item_type === 'setting').map((i) => i.payload),
  ].filter((s) => ['충돌', '공백'].includes(s?.status));
  if (goldSettings.length === 0) {
    metrics.push({
      key: 'setting_recall', label: '설정 충돌 재현', value: null, target: '≥ 0.8', status: 'na',
      note: '골드 설정 항목 없음 — 판정 콘솔에서 설정 채택 필요',
    });
  } else {
    const hit = goldSettings.filter((g) =>
      runSettings.some((r) => similarity(g.title ?? '', r.title ?? '') >= 0.3)
    ).length;
    const v = hit / goldSettings.length;
    metrics.push({
      key: 'setting_recall', label: '설정 충돌 재현', value: v, target: '≥ 0.8',
      status: v >= 0.8 ? 'pass' : 'fail', note: `${hit}/${goldSettings.length}`,
    });
  }

  // 필수 케이스 — 편의점 장면 R25 A급 (통과 전 릴리즈 불가, 골드 원고 전용 기준)
  const applicable = (manuscriptTitle ?? '').replace(/\s+/g, '').includes('요리는잘하는사람');
  const rcHit =
    applicable &&
    runA.some(
      (r) =>
        r.rule_id === REQUIRED_CASE.rule &&
        extractPages(r.loc).some((p) => p >= REQUIRED_CASE.pageMin && p <= REQUIRED_CASE.pageMax)
    );
  return {
    metrics,
    requiredCase: {
      passed: rcHit,
      applicable,
      label: '필수 케이스: 편의점 장면을 R25 A급으로 탐지',
      detail: !applicable
        ? '이 원고에는 적용되지 않는 기준입니다 (골드 원고 『요리는 잘 하는 사람』 전용)'
        : rcHit
          ? '통과 — 편집자 A급 1위 장면을 자력으로 재현'
          : `미통과 — ${REQUIRED_CASE.pageMin}~${REQUIRED_CASE.pageMax}쪽 범위의 R25 A급 결함이 이 실행에 없음`,
    },
  };
}
