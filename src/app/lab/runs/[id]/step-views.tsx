'use client';

// 단계별 읽기 뷰 — 판정 항목(lab_items)이 커버하지 않는 산출물을 사람이 읽을 수 있게 렌더링
// 디자인 원칙: 라이트 고정(/lab 레이아웃), 에이전트가 쓴 글은 KoPub 바탕(lab.css),
//             인물별 컬러 체계 공유, 색으로 뜻을 나누는 블록에는 반드시 범례를 단다
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ── 의미색 — 판정 카드(page.tsx)·범례가 함께 쓰는 단일 출처 ──
export const TONE = {
  good: '#059669', // 장점 · 일관 · 안다 · 빛나는 순간
  severe: '#dc2626', // A급 · 충돌 · 부재
  warn: '#d97706', // B급 · 공백 · 흔들리는 지점 · 고를 것
  mild: '#64748b', // C급 · 참고 · 모른다
  lineEdit: '#7c3aed', // 첨삭
  question: '#0891b2', // 질문
  belief: '#2563eb', // 믿는다 · 확인
  linda: '#b45309', // 린다포인트
  neutral: '#78716c', // 색이 아니라 모양으로 구분하는 범례용
};

/** 린다포인트 표식 — 『시나리오 거듭나기』 유래 산출물 구분 (원칙 문서 §3) */
export function LindaMark() {
  return (
    <span
      className="inline-flex items-center rounded-sm px-1 py-px align-middle text-[10px] font-bold tracking-wider"
      style={{ color: TONE.linda, backgroundColor: `${TONE.linda}14`, border: `1px solid ${TONE.linda}55` }}
      title="린다포인트 — 『시나리오 거듭나기』(린다 시거) 원칙에서 유래한 점검"
    >
      린다
    </span>
  );
}

/** 의미색 칩 — 면 틴트 + 같은 색 글자 */
export function Chip({ color, children, className = '' }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-semibold ${className}`}
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}45` }}
    >
      {children}
    </span>
  );
}

/** 긴 글 — 빈 줄은 단락, 줄바꿈은 문단(첫 줄 들여쓰기). 서체·행간은 lab.css */
export function Prose({ text, className = '' }: { text?: unknown; className?: string }) {
  if (!text) return null;
  const blocks = String(text).trim().split(/\n\s*\n/);
  return (
    <div className={`lab-prose ${className}`}>
      {blocks.map((b, i) => (
        <div key={i} className="lab-block">
          {b
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, j) => (
              <p key={j}>{line}</p>
            ))}
        </div>
      ))}
    </div>
  );
}

// ── 범례 ──
type Swatch = 'dot' | 'line' | 'dash' | 'chip' | 'outline' | 'fill';
export interface LegendItem {
  color: string;
  label: string;
  desc?: string;
  swatch?: Swatch;
}

function SwatchIcon({ color, swatch }: { color: string; swatch: Swatch }) {
  if (swatch === 'line' || swatch === 'dash') {
    return (
      <svg width="22" height="8" aria-hidden className="shrink-0">
        <line
          x1="1" y1="4" x2="21" y2="4"
          stroke={color}
          strokeWidth={swatch === 'line' ? 2 : 1.4}
          strokeDasharray={swatch === 'dash' ? '4 3' : undefined}
        />
      </svg>
    );
  }
  if (swatch === 'chip') return <span className="inline-block h-3 w-5 shrink-0 rounded" style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}66` }} />;
  if (swatch === 'fill') return <span className="inline-block h-3 w-5 shrink-0 rounded" style={{ backgroundColor: `${color}55`, border: `1px solid ${color}` }} />;
  if (swatch === 'outline') return <span className="inline-block h-3 w-5 shrink-0 rounded" style={{ border: `1px dashed ${color}` }} />;
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

/** 색 범례 — 블록 안에서 색·모양이 무엇을 뜻하는지(왜 다르게 칠했는지) 밝힌다 */
export function Legend({ items, note }: { items: LegendItem[]; note?: string }) {
  if (!items.length && !note) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-dashed px-3 py-2 text-xs">
      <span className="font-semibold text-muted-foreground">범례</span>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <SwatchIcon color={it.color} swatch={it.swatch ?? 'dot'} />
          <span className="font-semibold text-foreground/85">{it.label}</span>
          {it.desc && <span className="text-muted-foreground">{it.desc}</span>}
        </span>
      ))}
      {note && <span className="basis-full leading-relaxed text-muted-foreground">{note}</span>}
    </div>
  );
}

// ── 인물별 컬러 체계 (모든 뷰가 공유: 관계도·장면 카드·감정 흐름·지식 표) ──
const CHAR_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ea580c', '#65a30d', '#c026d3'];

function charColorMap(characters: { name: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  (characters ?? []).forEach((c, i) => m.set(c.name, CHAR_COLORS[i % CHAR_COLORS.length]));
  return m;
}

/** 이름 매칭 — target 문자열("고하성(아이)" 등)에서 등장 인물을 찾는다 */
function matchCharacter(text: string | undefined, names: string[]): string | null {
  if (!text) return null;
  for (const n of names) if (text.includes(n)) return n;
  return null;
}

/** 블록 안의 보조 카드 */
const CARD = 'rounded-lg border bg-background/70 p-3';

/** 필드 이름 — 본문(바탕)과 구분되는 고딕 소제목 */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-semibold text-muted-foreground">{children}</p>;
}

export function EvidenceList({ evidence }: { evidence: any[] }) {
  if (!evidence?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {evidence.map((e, i) => (
        <li key={i} className="lab-serif border-l-2 border-foreground/15 pl-2.5 text-[13px] text-foreground/70">
          <span className="mr-1 font-sans text-[11px] font-semibold text-muted-foreground">{e.loc}</span>“{e.quote}”
          {e._evidence_valid === false && (
            <Badge variant="destructive" className="ml-1 font-sans text-[10px]">인용 검증 실패</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  sub,
  linda,
  legend,
  note,
  children,
}: {
  title: string;
  sub?: string;
  linda?: boolean;
  legend?: LegendItem[];
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-[15px] font-bold tracking-wide">
          {title}
          {linda && <span className="ml-1.5"><LindaMark /></span>}
        </h3>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {(legend?.length || note) && <Legend items={legend ?? []} note={note} />}
      {children}
    </section>
  );
}

// ── 스토리 골격 트랙 (린다포인트) — 골격 요소를 분량 비율 위에 배치 ──
const SPINE_LABELS: Record<string, string> = {
  catalyst: '카타리스트',
  turning_point_1: '제1전환점',
  midpoint: '미드포인트',
  low_point: '로우포인트',
  climax: '클라이맥스',
  central_question: '중심 질문',
};

/** 모델이 메모에 스키마 키 이름(midpoint 등)을 그대로 쓴 경우 한국어 이름으로 바꿔 보여준다 */
function koSpine(text: unknown): string {
  return String(text ?? '').replace(
    /\b(catalyst|turning_point_1|midpoint|low_point|climax|central_question)\b/g,
    (k) => SPINE_LABELS[k] ?? k
  );
}

/** 트랙 라벨 줄 배정 — 가까운 점끼리 라벨이 겹치지 않게 아래 줄로 엇갈려 놓는다 (최대 3줄) */
const SPINE_LABEL_GAP = 14; // 라벨 폭(80px)이 트랙에서 차지하는 대략의 % 간격
const SPINE_ROW_STEP = 26; // 줄 간격(px)

function StorySpine({ spine }: { spine: any }) {
  if (!spine) return null;
  const keys = ['catalyst', 'turning_point_1', 'midpoint', 'low_point', 'climax'];
  const items = keys
    .map((k) => ({ key: k, ...(spine[k] ?? {}) }))
    .filter((e) => e && (e.loc || e.summary));
  const lastInRow = [-Infinity, -Infinity, -Infinity];
  const placed = items
    .filter((e) => typeof e.percent === 'number' && e.percent > 0 && e.loc !== '부재')
    .map((e) => ({ ...e, p: Math.min(Math.max(e.percent, 2), 98) }))
    .sort((a, b) => a.p - b.p)
    .map((e) => {
      let row = lastInRow.findIndex((last) => e.p - last >= SPINE_LABEL_GAP);
      if (row < 0) row = lastInRow.indexOf(Math.min(...lastInRow));
      lastInRow[row] = e.p;
      return { ...e, row };
    });
  const maxRow = Math.max(0, ...placed.map((e) => e.row));
  return (
    <Section
      title="스토리 골격"
      sub="점의 위치는 원고 전체 분량 중 몇 % 지점인지를 뜻합니다"
      linda
      legend={[
        { color: TONE.linda, label: '골격 요소', desc: '린다포인트 점검으로 찾은 위치' },
        { color: TONE.severe, label: '부재 · 미도달', desc: '찾지 못했거나 원고가 아직 닿지 않은 요소' },
      ]}
    >
      {spine.central_question && (
        <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: `${TONE.linda}0d`, border: `1px solid ${TONE.linda}40` }}>
          <p className="text-[11px] font-bold" style={{ color: TONE.linda }}>중심 질문</p>
          <p className="lab-serif text-[15px]">{spine.central_question}</p>
        </div>
      )}
      {placed.length > 0 && (
        <div className="relative mx-6 mt-6 h-1 rounded bg-muted" style={{ marginBottom: 40 + maxRow * SPINE_ROW_STEP }}>
          {placed.map((e) => (
            <div key={e.key} className="absolute top-0" style={{ left: `${e.p}%` }}>
              <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1 rounded-full border-2 bg-white" style={{ borderColor: TONE.linda }} />
              {/* 아래 줄로 내려간 라벨은 점과 가는 선으로 잇는다 */}
              {e.row > 0 && (
                <div className="absolute w-px -translate-x-1/2 bg-muted-foreground/30" style={{ top: 9, height: e.row * SPINE_ROW_STEP + 3 }} />
              )}
              <p
                className="absolute w-20 -translate-x-1/2 text-center text-[10px] leading-tight text-muted-foreground"
                style={{ top: 12 + e.row * SPINE_ROW_STEP }}
              >
                {SPINE_LABELS[e.key]}
                <br />{e.percent}%
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {items.map((e) => {
          const missing = e.loc === '부재' || e.loc === '미도달';
          return (
            <div key={e.key} className="flex gap-3">
              <span className="w-20 shrink-0 pt-0.5 text-xs font-semibold" style={{ color: missing ? TONE.severe : TONE.linda }}>
                {SPINE_LABELS[e.key]}
              </span>
              <div className="text-sm">
                <span className="text-xs font-semibold text-muted-foreground">
                  {e.loc}{typeof e.percent === 'number' && e.percent > 0 ? ` · ${e.percent}%` : ''}
                </span>
                {e.summary && <p className="lab-serif">{koSpine(e.summary)}</p>}
                {e.key === 'low_point' && e.new_info_follows === false && (
                  <p className="text-xs" style={{ color: TONE.severe }}>뒤따르는 새 정보가 없습니다</p>
                )}
              </div>
            </div>
          );
        })}
        {spine.note && <p className="lab-serif mt-1 text-sm" style={{ color: TONE.linda }}>※ {koSpine(spine.note)}</p>}
      </div>
    </Section>
  );
}

function settingTone(status?: string): string {
  if (status === '충돌') return TONE.severe;
  if (status === '공백') return TONE.warn;
  return TONE.good;
}

// ── 인물 관계도 — 그림(노드·화살표) + 인물 명단(색 범례) + 관계 목록 ──
interface Relation {
  from: string;
  to: string;
  points: { emotion: string; turning: boolean }[];
}

/** emotion_arcs의 대상(target)으로 인물 간 관계를 모은다. A의 감정이 B를 향하면 A→B */
function buildRelations(arcs: any[], names: string[]): Relation[] {
  const rels = new Map<string, Relation>();
  for (const arc of arcs ?? []) {
    const from = matchCharacter(arc.character, names);
    if (!from) continue;
    for (const p of arc.points ?? []) {
      const to = matchCharacter(p.target, names);
      if (!to || to === from) continue;
      const key = `${from}→${to}`;
      if (!rels.has(key)) rels.set(key, { from, to, points: [] });
      rels.get(key)!.points.push({ emotion: p.emotion ?? '', turning: !!p.is_turning_point });
    }
  }
  return [...rels.values()];
}

/** 관계의 대표 감정 — 마지막 전환점, 없으면 마지막 감정 */
function relationLabel(r: Relation): string {
  const rev = [...r.points].reverse();
  return (rev.find((p) => p.turning && p.emotion) ?? rev.find((p) => p.emotion))?.emotion ?? '';
}

function CharacterGraph({
  chars,
  colors,
  rels,
  selected,
  onToggle,
}: {
  chars: any[];
  colors: Map<string, string>;
  rels: Relation[];
  selected: string | null;
  onToggle: (name: string) => void;
}) {
  const W = 720;
  const H = chars.length <= 4 ? 320 : chars.length <= 7 ? 400 : 470;
  const cx = W / 2, cy = H / 2 - 8;
  const rx = W / 2 - 90, ry = H / 2 - 56;
  const pos = new Map<string, { x: number; y: number }>();
  chars.forEach((c, i) => {
    const a = (Math.PI * 2 * i) / chars.length - Math.PI / 2;
    pos.set(c.name, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  });

  const keys = new Set(rels.map((r) => `${r.from}→${r.to}`));
  const touches = (r: Relation) => !!selected && (r.from === selected || r.to === selected);
  const connected = new Set<string>();
  if (selected) {
    connected.add(selected);
    rels.forEach((r) => {
      if (r.from === selected) connected.add(r.to);
      if (r.to === selected) connected.add(r.from);
    });
  }
  // 선택된 인물의 관계를 마지막에 그려 위로 올린다
  const ordered = [...rels].sort((a, b) => Number(touches(a)) - Number(touches(b)));

  // 곡선 기하 — 노드 반지름만큼 양끝을 줄이고, 법선 방향으로 휜다 (쌍방이면 더 휘어 서로 비켜 감)
  const geo = ordered.map((r) => {
    const a = pos.get(r.from)!, b = pos.get(r.to)!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const sx = a.x + (dx / len) * 30, sy = a.y + (dy / len) * 30;
    const ex = b.x - (dx / len) * 34, ey = b.y - (dy / len) * 34;
    const nx = -dy / len, ny = dx / len;
    const bend = keys.has(`${r.to}→${r.from}`) ? 24 : 10;
    const qx = (sx + ex) / 2 + nx * bend, qy = (sy + ey) / 2 + ny * bend;
    // 곡선의 실제 중점(t=0.5)
    return { r, sx, sy, ex, ey, qx, qy, nx, ny, midX: (sx + 2 * qx + ex) / 4, midY: (sy + 2 * qy + ey) / 4 };
  });

  // 감정 라벨 배치 — 곡선 중점에서 바깥(법선 방향)으로 밀어내며 다른 라벨·노드·인물 이름과 겹치지 않는 첫 자리를 고른다
  type Box = { l: number; r: number; t: number; b: number };
  const hit = (p: Box, q: Box) => p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;
  const taken: Box[] = chars.flatMap((c) => {
    const p = pos.get(c.name)!;
    const w = c.name.length * 13 + 6;
    return [
      { l: p.x - 26, r: p.x + 26, t: p.y - 26, b: p.y + 26 },
      { l: p.x - w / 2, r: p.x + w / 2, t: p.y + 33, b: p.y + 50 },
    ];
  });
  const labels = new Map<string, { x: number; y: number; anchor: 'start' | 'middle' | 'end'; text: string }>();
  for (const g of geo) {
    const text = touches(g.r) ? relationLabel(g.r).slice(0, 14) : '';
    if (!text) continue;
    const anchor = g.nx > 0.35 ? 'start' : g.nx < -0.35 ? 'end' : 'middle';
    const w = text.length * 12 + 4, h = 16;
    let spot: { x: number; y: number; box: Box } | null = null;
    for (let k = 0; k < 12; k++) {
      const d = 8 + k * 9;
      const y = Math.min(Math.max(g.midY + g.ny * d, h), H - h);
      const rawX = g.midX + g.nx * d;
      // 캔버스 밖으로 나가지 않게 상자를 먼저 맞춘 뒤 글자 기준점을 되돌려 계산
      const rawL = anchor === 'start' ? rawX : anchor === 'end' ? rawX - w : rawX - w / 2;
      const l = Math.min(Math.max(rawL, 2), W - w - 2);
      const x = anchor === 'start' ? l : anchor === 'end' ? l + w : l + w / 2;
      spot = { x, y, box: { l, r: l + w, t: y - h / 2, b: y + h / 2 } };
      if (!taken.some((t) => hit(t, spot!.box))) break;
    }
    taken.push(spot!.box);
    labels.set(`${g.r.from}→${g.r.to}`, { x: spot!.x, y: spot!.y, anchor, text });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="인물 관계도">
      <defs>
        {[...colors.entries()].map(([n, col]) => (
          <marker key={n} id={`arrow-${n.replace(/\W/g, '')}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={col} />
          </marker>
        ))}
      </defs>

      {/* 빈 곳을 누르면 선택 해제 */}
      <rect width={W} height={H} fill="transparent" onClick={() => selected && onToggle(selected)} />

      {geo.map(({ r, sx, sy, ex, ey, qx, qy }) => {
        const col = colors.get(r.from)!;
        const active = touches(r);
        const dim = !!selected && !active;
        const turning = r.points.some((p) => p.turning);
        const label = labels.get(`${r.from}→${r.to}`);
        return (
          <g key={`${r.from}→${r.to}`} pointerEvents="none">
            <path
              d={`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`}
              fill="none"
              stroke={col}
              strokeWidth={turning ? (active ? 2.6 : 2) : active ? 1.8 : 1.2}
              strokeDasharray={turning ? undefined : '5 4'}
              opacity={dim ? 0.08 : active ? 0.95 : 0.5}
              markerEnd={`url(#arrow-${r.from.replace(/\W/g, '')})`}
            />
            {label && (
              <text
                x={label.x} y={label.y}
                textAnchor={label.anchor} dominantBaseline="middle"
                fontSize="12" fontWeight="600" fill={col}
                stroke="white" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke"
              >
                {label.text}
              </text>
            )}
          </g>
        );
      })}

      {chars.map((c) => {
        const p = pos.get(c.name)!;
        const col = colors.get(c.name)!;
        const on = selected === c.name;
        const faded = !!selected && !connected.has(c.name);
        return (
          <g key={c.name} className="cursor-pointer" opacity={faded ? 0.3 : 1} onClick={() => onToggle(c.name)}>
            <title>{c.role ? `${c.name} — ${c.role}` : c.name}</title>
            <circle cx={p.x} cy={p.y} r="24" fill={col} fillOpacity="0.12" />
            <circle cx={p.x} cy={p.y} r="24" fill="none" stroke={col} strokeWidth={on ? 3 : 1.5} />
            {/* 사람 아이콘 */}
            <circle cx={p.x} cy={p.y - 6} r="6" fill={col} />
            <path d={`M${p.x - 10},${p.y + 13} a10 10 0 0 1 20 0 z`} fill={col} />
            <text
              x={p.x} y={p.y + 43}
              textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor"
              stroke="white" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke"
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CharacterMap({ characters, arcs }: { characters: any[]; arcs: any[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const chars = (characters ?? []).slice(0, 10);
  const colors = charColorMap(chars);
  const names = chars.map((c) => c.name);
  const rels = buildRelations(arcs, names);
  const toggle = (n: string) => setSelected((cur) => (cur === n ? null : n));

  // 관계 목록 — 선택이 있으면 그 인물이 주고받는 관계만, 출발 인물별로 묶는다
  const shown = selected ? rels.filter((r) => r.from === selected || r.to === selected) : rels;
  const groups = names
    .map((n) => ({ from: n, rels: shown.filter((r) => r.from === n) }))
    .filter((g) => g.rels.length > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* 명단이 그림보다 길어도 그림이 화면에 남도록 고정 */}
        <div className="self-start lg:sticky lg:top-4">
          <CharacterGraph chars={chars} colors={colors} rels={rels} selected={selected} onToggle={toggle} />
        </div>
        <ul className="space-y-0.5 self-start">
          {chars.map((c) => {
            const col = colors.get(c.name)!;
            const on = selected === c.name;
            return (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => toggle(c.name)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left transition-colors ${on ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                    {c.name}
                  </span>
                  {c.role && <span className="lab-serif mt-0.5 block text-[12.5px] text-muted-foreground">{c.role}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {groups.length > 0 && (
        <div className="border-t pt-4">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground">
            {selected ? `${selected} — 주고받는 관계 (다시 누르면 전체 보기)` : '관계 목록 — 감정의 흐름은 › 로 잇고, 굵은 글씨가 전환점'}
          </p>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g.from}>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.get(g.from) }} />
                  {g.from}
                </p>
                <ul className="space-y-1 pl-4">
                  {g.rels.map((r) => (
                    <li key={r.to} className="text-[13px] leading-relaxed">
                      <span className="text-muted-foreground">→ </span>
                      <span className="font-semibold" style={{ color: colors.get(r.to) }}>{r.to}</span>
                      <span className="mx-1.5 text-muted-foreground">·</span>
                      {r.points.map((p, i) => (
                        <span key={i} className={p.turning ? 'font-bold text-foreground' : 'text-foreground/70'}>
                          {i > 0 && <span className="mx-1 font-normal text-muted-foreground/60">›</span>}
                          {p.emotion}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 단계 0.5: 시놉시스 대조 ──────────────────────────────
function Step05({ out }: { out: any }) {
  const list = out.divergences ?? [];
  return (
    <Section title="시놉시스와 갈라진 지점" sub={`${list.length}건 — 갈라짐은 결함이 아니라 확인 대상`}>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">갈라진 지점이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((d: any, i: number) => (
            <div key={i} className={CARD}>
              <p className="text-sm font-semibold">{d.item}</p>
              <div className="mt-1.5 space-y-1 text-sm">
                <div><FieldLabel>시놉시스</FieldLabel><p className="lab-serif">{d.synopsis_state}</p></div>
                <div><FieldLabel>원고</FieldLabel><p className="lab-serif">{d.manuscript_state}</p></div>
              </div>
              <EvidenceList evidence={d.evidence} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── 단계 1: 구조화 ──────────────────────────────────────
function Step1({ out }: { out: any }) {
  const chars = out.characters ?? [];
  const colors = charColorMap(chars);
  const names = chars.map((c: any) => c.name);
  const sceneColor = (s: any) => {
    const n = matchCharacter((s.characters ?? [])[0], names) ?? (s.characters ?? [])[0];
    return colors.get(n) ?? TONE.mild;
  };
  const charLegend: LegendItem[] = chars.slice(0, 10).map((c: any) => ({ color: colors.get(c.name)!, label: c.name }));

  return (
    <div className="space-y-4">
      {chars.length > 0 && (
        <Section
          title="인물 관계도"
          sub="화살표는 감정이 향하는 방향입니다"
          legend={[
            { color: TONE.neutral, swatch: 'line', label: '실선', desc: '전환점을 지난 관계' },
            { color: TONE.neutral, swatch: 'dash', label: '점선', desc: '아직 전환점이 없는 관계' },
          ]}
          note="선의 색은 감정을 보내는 인물의 색이고, 인물 색의 범례는 오른쪽 명단입니다. 그림이나 명단에서 인물을 누르면 그 인물이 주고받는 관계만 남고 감정이 함께 표시됩니다."
        >
          <CharacterMap characters={chars} arcs={out.emotion_arcs ?? []} />
        </Section>
      )}

      {out.story_spine && <StorySpine spine={out.story_spine} />}

      {out.scenes?.length > 0 && (
        <Section
          title={`장면 ${out.scenes.length}개`}
          legend={charLegend}
          note="카드 색은 그 장면에 가장 먼저 등장하는 인물의 색입니다."
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {out.scenes.map((s: any, i: number) => {
              const col = sceneColor(s);
              return (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${col}0f`, border: `1px solid ${col}33` }}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold" style={{ color: col }}>{s.scene_id}</span>
                    <span>{s.loc}</span>
                  </div>
                  <p className="lab-serif mt-1.5 text-[14px]">{s.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(s.characters ?? []).map((n: string, j: number) => {
                      const key = matchCharacter(n, names) ?? n;
                      const ccol = colors.get(key) ?? TONE.mild;
                      return (
                        <span key={j} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-px text-[10px] text-foreground/80">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ccol }} />
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {out.settings?.length > 0 && (
        <Section
          title="설정 추출"
          sub="충돌·공백은 6단계 판정 카드에서 작가 질문으로 이어집니다"
          legend={[
            { color: TONE.severe, swatch: 'chip', label: '충돌', desc: '같은 항목에 값이 둘 이상' },
            { color: TONE.warn, swatch: 'chip', label: '공백', desc: '값이 없는데 플롯이 기대는 항목' },
            { color: TONE.good, swatch: 'chip', label: '일관', desc: '값이 하나로 맞음' },
          ]}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.settings.map((s: any, i: number) => (
              <div key={i} className={CARD}>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip color={settingTone(s.status)}>{s.status}</Chip>
                  <span className="text-sm font-semibold">{s.title}</span>
                  {s.plot_depends && <span className="text-[10px] text-muted-foreground">플롯 의존</span>}
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {(s.values ?? []).map((v: any, j: number) => (
                    <li key={j} className="lab-serif text-[13px]">
                      <span className="mr-1 font-sans text-[11px] font-semibold text-muted-foreground">{v.loc}</span>
                      {v.value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.emotion_arcs?.length > 0 && (
        <Section
          title="인물별 감정 흐름"
          legend={[
            { color: TONE.neutral, swatch: 'fill', label: '강', desc: '진하게 칠한 칩' },
            { color: TONE.neutral, swatch: 'chip', label: '중', desc: '옅게 칠한 칩' },
            { color: TONE.neutral, swatch: 'outline', label: '약', desc: '테두리만 있는 칩' },
          ]}
          note="칩의 색은 인물 색입니다. 굵은 글씨에 실선 테두리를 두른 칩이 감정이 바뀐 전환점이고, 그 아래 ⚡ 줄이 전환을 일으킨 계기입니다."
        >
          <div className="space-y-4">
            {out.emotion_arcs.map((arc: any, i: number) => {
              const key = matchCharacter(arc.character, names) ?? arc.character;
              const col = colors.get(key) ?? TONE.mild;
              return (
                <div key={i}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                    {arc.character}
                  </p>
                  <div className="flex flex-wrap items-start gap-y-2">
                    {(arc.points ?? []).map((p: any, j: number) => {
                      const strong = p.intensity === '강';
                      const weak = p.intensity === '약';
                      return (
                        <div key={j} className="flex items-start">
                          {j > 0 && <span className="mx-1 mt-1.5 text-muted-foreground/50">›</span>}
                          <div className="max-w-[170px]">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 ${p.is_turning_point ? 'text-[12px] font-bold' : 'text-[11px]'}`}
                              style={{
                                backgroundColor: strong ? `${col}38` : weak ? 'transparent' : `${col}17`,
                                border: `1px ${p.is_turning_point ? 'solid' : 'dashed'} ${col}${p.is_turning_point ? '' : '80'}`,
                                color: col,
                              }}
                              title={`${p.loc ?? ''} ${p.target ? '→ ' + p.target : ''}`}
                            >
                              {p.emotion}
                            </span>
                            {p.is_turning_point && p.trigger && (
                              <p className="lab-serif mt-0.5 text-[12px] text-muted-foreground">⚡ {p.trigger}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {out.knowledge_states?.length > 0 && (
        <Section
          title="인물별 지식 상태"
          sub="장면이 끝날 때 무엇을 알고 · 믿고 · 모르는가"
          legend={[
            { color: TONE.good, swatch: 'chip', label: '안다', desc: '원고에서 확인된 사실' },
            { color: TONE.belief, swatch: 'chip', label: '믿는다', desc: '사실과 다를 수 있는 믿음' },
            { color: TONE.mild, swatch: 'chip', label: '모른다', desc: '아직 알지 못하는 것' },
          ]}
          note="이름 앞 점의 색은 인물 색입니다."
        >
          <div className="space-y-3">
            {names
              .filter((n: string) => (out.knowledge_states ?? []).some((k: any) => matchCharacter(k.character, names) === n))
              .map((n: string) => {
                const col = colors.get(n) ?? TONE.mild;
                const rows = (out.knowledge_states ?? []).filter((k: any) => matchCharacter(k.character, names) === n);
                return (
                  <div key={n} className={CARD}>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                      {n}
                    </p>
                    <div className="space-y-2.5">
                      {rows.map((k: any, i: number) => (
                        <div key={i} className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[90px_1fr]">
                          <span className="font-mono text-xs text-muted-foreground">{k.scene_id} {k.loc}</span>
                          <div className="lab-serif space-y-0.5 text-[13px]">
                            {k.knows?.length > 0 && <p><KnowTag color={TONE.good}>안다</KnowTag>{k.knows.join(' · ')}</p>}
                            {k.believes?.length > 0 && <p><KnowTag color={TONE.belief}>믿는다</KnowTag>{k.believes.join(' · ')}</p>}
                            {k.does_not_know?.length > 0 && (
                              <p className="text-muted-foreground"><KnowTag color={TONE.mild}>모른다</KnowTag>{k.does_not_know.join(' · ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      {out.devices?.length > 0 && (
        <Section title="반복 장치" sub="첫 등장 → 재등장 위치">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.devices.map((d: any, i: number) => (
              <div key={i} className={CARD}>
                <p className="text-sm font-semibold">🔁 {d.name}</p>
                <p className="lab-serif mt-1 text-[13px] text-foreground/75">
                  <span className="mr-1 font-sans text-[11px] font-semibold text-muted-foreground">{d.first?.loc}</span>“{d.first?.quote}”
                </p>
                {(d.recurrences ?? []).length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    재등장: {(d.recurrences ?? []).map((r: any) => r.loc).join(' → ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.timeline?.length > 0 && (
        <Section title="타임라인 메모" sub="경과 시간 역산 포함">
          <ul className="space-y-2">
            {out.timeline.map((t: any, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">🕐</span>
                <div>
                  <p className="lab-serif text-[14px]">{t.note}</p>
                  <EvidenceList evidence={t.evidence} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function KnowTag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="mr-1.5 inline-block rounded px-1 align-[1px] font-sans text-[10px] font-semibold" style={{ backgroundColor: `${color}1a`, color }}>
      {children}
    </span>
  );
}

// ── 단계 2: 문체 프로파일 ────────────────────────────────
function Step2({ out }: { out: any }) {
  const p = out.style_profile ?? out;
  const tiles = [
    { label: '시점', value: p.pov },
    { label: '시제', value: p.tense },
    { label: '장면 · 대화 · 요약', value: p.scene_dialogue_summary_ratio },
    { label: '서술자의 논평 대상', value: p.narrator_target },
  ].filter((t) => t.value);
  return (
    <div className="space-y-4">
      <Section title="원고의 약속" sub="이 원고가 스스로 세운 규칙 — 이후 모든 판단의 기준">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <div key={i} className={CARD}>
              <p className="text-[11px] text-muted-foreground">{t.label}</p>
              <p className="lab-serif mt-1 text-sm font-bold">{t.value}</p>
            </div>
          ))}
        </div>
        {p.promises?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {p.promises.map((x: string, i: number) => (
              <li key={i} className="flex gap-2 text-[14px]">
                <span className="font-semibold" style={{ color: TONE.good }}>✓</span>
                <span className="lab-serif">{x}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.genre_signals?.length > 0 && (
        <Section title="장르 신호" sub="웃음·긴장이 만들어지는 기제">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {p.genre_signals.map((g: any, i: number) => (
              <div key={i} className={CARD}>
                <p className="text-sm font-semibold">{g.signal}</p>
                <p className="lab-serif mt-0.5 text-[13px] text-foreground/80">{g.mechanism}</p>
                <EvidenceList evidence={g.evidence} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {p.focal_characters?.length > 0 && (
        <Section title="장면별 초점 인물">
          <div className="flex flex-wrap gap-1.5">
            {p.focal_characters.map((f: any, i: number) => (
              <span key={i} className="rounded-md border bg-background/70 px-2 py-0.5 text-xs">
                <span className="font-mono text-muted-foreground">{f.scene_id}</span> <b>{f.character}</b>
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── 단계 3 보조: planted (장점 항목은 판정 카드가 담당) ──
function Step3Extra({ out }: { out: any }) {
  if (!out.planted?.length) return null;
  return (
    <Section title={`심어둔 것 ${out.planted.length}건`} sub="다음 부에서 격발되는지 추적">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {out.planted.map((p: any, i: number) => (
          <div key={i} className={CARD}>
            <p className="text-sm font-semibold">🌱 {p.name} <span className="text-xs font-normal text-muted-foreground">{p.loc}</span></p>
            <p className="lab-serif mt-1 text-[13px] text-foreground/75">“{p.quote}”</p>
            <p className="lab-serif mt-1 text-[13px]"><span className="font-sans text-muted-foreground">→</span> {p.expected_fire}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── 단계 6 보조: 총평·A급·작가 질문 (설정 항목은 판정 카드가 담당) ──
const QUESTION_KINDS: Record<string, { label: string; color: string; desc: string }> = {
  confirm: { label: '확인', color: TONE.belief, desc: '원고 내용이 의도대로인지 확인' },
  choose: { label: '고를 것', color: TONE.warn, desc: '작가가 선택해야 할 갈림길' },
  reference: { label: '참고', color: TONE.mild, desc: '판단에 참고할 정보' },
};

function Step6Extra({ out }: { out: any }) {
  const kindsUsed = Object.entries(QUESTION_KINDS).filter(([k]) => (out.author_questions ?? []).some((q: any) => q.kind === k));
  return (
    <div className="space-y-4">
      {out.summary && (
        <section className="rounded-xl border-2 border-foreground/15 bg-white p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest text-foreground/70">
            총평
            {out.intervention && (
              <Badge variant={out.intervention === 'redesign' ? 'destructive' : 'secondary'}>
                {out.intervention === 'redesign' ? '재설계형' : '비평형'}
              </Badge>
            )}
          </div>
          <Prose text={out.summary} className="text-[16px]" />
        </section>
      )}

      {out.overall && (
        <Section title="작품 단위 평가">
          <div className="divide-y">
            {out.overall.logline && (
              <div className="pb-4">
                <FieldLabel>한 문장으로</FieldLabel>
                <p className="lab-serif text-[16px] font-bold">{out.overall.logline}</p>
              </div>
            )}
            {out.overall.protagonist_arc && (
              <div className="py-4">
                <FieldLabel>주인공의 궤적</FieldLabel>
                <Prose text={out.overall.protagonist_arc} className="text-[15px]" />
              </div>
            )}
            {out.overall.structure && (
              <div className="py-4">
                <FieldLabel>구조와 주제</FieldLabel>
                <Prose text={out.overall.structure} className="text-[15px]" />
              </div>
            )}
            {out.overall.readability_pattern && (
              <div className="pt-4">
                <FieldLabel>읽히는 장면의 공통점</FieldLabel>
                <Prose text={out.overall.readability_pattern} className="text-[15px]" />
              </div>
            )}
          </div>
        </Section>
      )}

      {out.intervention === 'redesign' && out.redesign && (
        <Section title="재설계 제안" sub="구조가 아직 서지 않은 원고로 판정됨 — 설계 수준의 수정안">
          <div className="space-y-5 text-sm">
            {out.redesign.theme && (
              <div>
                <FieldLabel>테마 재정의</FieldLabel>
                <Prose text={out.redesign.theme} className="text-[15px]" />
              </div>
            )}
            {out.redesign.title_proposal && (
              <div>
                <FieldLabel>제목 제안</FieldLabel>
                <p className="lab-serif text-[15px]">
                  {Array.isArray(out.redesign.title_proposal) ? out.redesign.title_proposal.join(' / ') : out.redesign.title_proposal}
                </p>
              </div>
            )}
            {out.redesign.chapter_template && (
              <div>
                <FieldLabel>꼭지 템플릿</FieldLabel>
                <Prose text={out.redesign.chapter_template} className="text-[15px]" />
              </div>
            )}
            {out.redesign.toc_proposal?.length > 0 && (
              <div>
                <FieldLabel>목차 수정안</FieldLabel>
                <div className="space-y-1.5">
                  {out.redesign.toc_proposal.map((t: any, i: number) => (
                    <div key={i} className="lab-serif grid gap-1 rounded-lg border bg-background/70 p-2.5 text-[13px] sm:grid-cols-[1fr_auto_1fr]">
                      <span className="text-muted-foreground line-through decoration-muted-foreground/40">{t.current}</span>
                      <span className="hidden font-sans text-muted-foreground sm:block">→</span>
                      <span className="whitespace-pre-wrap font-semibold">{t.proposed}</span>
                      {t.why && <p className="text-muted-foreground sm:col-span-3">∵ {t.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {out.redesign.term_table?.length > 0 && (
              <div>
                <FieldLabel>용어·은유 통일표</FieldLabel>
                {out.redesign.term_table.map((t: any, i: number) => (
                  <div key={i} className="lab-serif mb-1.5 border-l-2 border-foreground/15 pl-2.5 text-[13px]">
                    <p>{t.from} → <b>{t.to}</b></p>
                    {t.why && <p className="text-muted-foreground">{t.why}</p>}
                  </div>
                ))}
              </div>
            )}
            {out.redesign.prescriptions?.length > 0 && (
              <div>
                <FieldLabel>수치 처방</FieldLabel>
                {out.redesign.prescriptions.map((p: any, i: number) => (
                  <p key={i} className="lab-serif mb-1.5 border-l-2 border-foreground/15 pl-2.5 text-[13px]">
                    {p.what}: <b>{p.value}</b> <span className="text-muted-foreground">— {p.basis}</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.synopsis_sketch && (
              <div>
                <FieldLabel>개정 서사 골격</FieldLabel>
                <div className="rounded-lg border bg-background/70 p-4">
                  <Prose text={out.redesign.synopsis_sketch} className="text-[14px]" />
                </div>
              </div>
            )}
            {out.redesign.references?.length > 0 && (
              <div>
                <FieldLabel>실존 모델·참고자료</FieldLabel>
                {out.redesign.references.map((r: any, i: number) => (
                  <p key={i} className="lab-serif mb-1.5 border-l-2 border-foreground/15 pl-2.5 text-[13px]">
                    {r.target}: <b>{r.model}</b> <span className="text-muted-foreground">— {r.how}</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.timeline_proposal?.length > 0 && (
              <div>
                <FieldLabel>인물×시간 연표 제안</FieldLabel>
                <div className="space-y-1">
                  {out.redesign.timeline_proposal.map((t: any, i: number) => (
                    <div key={i} className="flex gap-2 text-[13px]">
                      <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{t.year}</span>
                      <div className="lab-serif">
                        {(t.entries ?? []).map((e: any, j: number) => (
                          <p key={j}><b>{e.character}</b> — {e.event}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {out.character_reviews?.length > 0 && (
        <Section
          title="확실히 좋아서 더 살리고 싶은 것 — 인물별"
          legend={[
            { color: TONE.good, label: '빛나는 순간', desc: '살릴 장면' },
            { color: TONE.warn, label: '흔들리는 지점', desc: '고칠 방향과 함께' },
          ]}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.character_reviews.map((c: any, i: number) => (
              <div key={i} className={CARD}>
                <p className="text-sm font-bold">{c.label || c.character}</p>
                {c.core_mechanism && (
                  <div className="mt-1.5"><FieldLabel>핵심 기제</FieldLabel><p className="lab-serif text-[13px]">{c.core_mechanism}</p></div>
                )}
                {c.shining?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold" style={{ color: TONE.good }}>✨ 빛나는 순간</p>
                    {c.shining.map((s: any, j: number) => (
                      <p key={j} className="lab-serif mt-0.5 text-[13px] text-foreground/80">
                        <span className="mr-1 font-sans text-[11px] font-semibold text-muted-foreground">{s.loc}</span>{s.why}
                      </p>
                    ))}
                  </div>
                )}
                {c.wobbles?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold" style={{ color: TONE.warn }}>⚠ 흔들리는 지점</p>
                    {c.wobbles.map((w: any, j: number) => (
                      <div key={j} className="lab-serif mt-0.5 text-[13px] text-foreground/80">
                        <p><span className="mr-1 font-sans text-[11px] font-semibold text-muted-foreground">{w.loc}</span>{w.problem}</p>
                        {w.direction && <p className="text-foreground"><span className="font-sans text-muted-foreground">→</span> {w.direction}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {c.emotion_note && (
                  <div className="mt-2"><FieldLabel>감정 흐름</FieldLabel><p className="lab-serif text-[13px]">{c.emotion_note}</p></div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.a_grade?.length > 0 && (
        <Section
          title={`가장 큰 것 — A급 ${out.a_grade.length}건`}
          sub="1~3건만 고릅니다"
          legend={[{ color: TONE.severe, swatch: 'chip', label: 'A급', desc: '구조를 흔드는 가장 큰 문제' }]}
        >
          <div className="space-y-2.5">
            {out.a_grade.map((a: any, i: number) => (
              <div key={i} className="flex gap-3 rounded-lg p-4" style={{ backgroundColor: `${TONE.severe}0a`, border: `1px solid ${TONE.severe}40` }}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: `${TONE.severe}1f`, color: TONE.severe }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{a.title}</p>
                  <Prose text={a.problem} className="mt-1.5 text-[15px]" />
                  {a.direction && (
                    <div className="mt-2.5">
                      <FieldLabel>방향</FieldLabel>
                      <Prose text={a.direction} className="text-[15px]" />
                    </div>
                  )}
                  <EvidenceList evidence={a.evidence} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.author_questions?.length > 0 && (
        <Section
          title={`작가 질문 ${out.author_questions.length}건`}
          legend={kindsUsed.map(([, k]) => ({ color: k.color, swatch: 'chip' as const, label: k.label, desc: k.desc }))}
        >
          <div className="space-y-3">
            {out.author_questions.map((q: any, i: number) => {
              const k = QUESTION_KINDS[q.kind] ?? { label: q.kind, color: TONE.mild };
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Chip color={k.color} className="mt-1">{k.label}</Chip>
                  <div className="min-w-0">
                    <p className="lab-serif text-[14px]">{q.question}</p>
                    {q.options?.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">후보 — {q.options.join(' / ')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

/** 단계 산출물 읽기 뷰. 판정 카드가 커버하는 부분은 중복 렌더링하지 않는다 */
export function StepOutputView({ step, output }: { step: string; output: any }) {
  if (!output) return null;
  switch (step) {
    case '0.5': return <Step05 out={output} />;
    case '1': return <Step1 out={output} />;
    case '2': return <Step2 out={output} />;
    case '3': return <Step3Extra out={output} />;
    case '6': return <Step6Extra out={output} />;
    default: return null;
  }
}
