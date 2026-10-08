'use client';

// 단계별 읽기 뷰 — 판정 항목(lab_items)이 커버하지 않는 산출물을 사람이 읽을 수 있게 렌더링
// 디자인 원칙: 다크 고정(/lab 레이아웃), 인물별 컬러 체계 공유, 표보다 카드·다이어그램
import { Badge } from '@/components/ui/badge';

// ── 인물별 컬러 체계 (모든 뷰가 공유: 관계도·장면 카드·감정 흐름·지식 표) ──
const CHAR_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee', '#fb923c', '#a3e635', '#e879f9'];

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

export function EvidenceList({ evidence }: { evidence: any[] }) {
  if (!evidence?.length) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {evidence.map((e, i) => (
        <li key={i} className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">
          <span className="font-medium text-foreground/70">{e.loc}</span> “{e.quote}”
          {e._evidence_valid === false && (
            <Badge variant="destructive" className="ml-1 text-[10px]">인용 검증 실패</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card/60 p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-bold tracking-wide">{title}</h3>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function statusColor(status?: string) {
  if (status === '충돌') return { badge: 'bg-red-500/15 text-red-300 border-red-500/40' };
  if (status === '공백') return { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
  return { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
}

// ── 인물 관계도 — 노드(아이콘) + 감정 흐름(emotion_arcs의 대상)을 선으로 연결 ──
function CharacterGraph({ characters, arcs }: { characters: any[]; arcs: any[] }) {
  const chars = (characters ?? []).slice(0, 10);
  if (chars.length === 0) return null;
  const colors = charColorMap(chars);
  const names = chars.map((c) => c.name);

  // 간선: A의 감정이 B(다른 인물)를 향하면 A→B. 전환점 감정을 우선 보관
  const edges = new Map<string, { from: string; to: string; emotion: string; turning: boolean }>();
  for (const arc of arcs ?? []) {
    const from = matchCharacter(arc.character, names);
    if (!from) continue;
    for (const p of arc.points ?? []) {
      const to = matchCharacter(p.target, names);
      if (!to || to === from) continue;
      const key = `${from}→${to}`;
      const prev = edges.get(key);
      if (!prev || (p.is_turning_point && !prev.turning) || !prev.emotion) {
        edges.set(key, { from, to, emotion: p.emotion ?? '', turning: !!p.is_turning_point });
      }
    }
  }

  const W = 720;
  const H = chars.length <= 4 ? 320 : chars.length <= 7 ? 400 : 470;
  const cx = W / 2, cy = H / 2 - 10;
  const rx = W / 2 - 110, ry = H / 2 - 64;
  const pos = new Map<string, { x: number; y: number }>();
  chars.forEach((c, i) => {
    const a = (Math.PI * 2 * i) / chars.length - Math.PI / 2;
    pos.set(c.name, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="인물 관계도">
      <defs>
        {[...colors.entries()].map(([n, col]) => (
          <marker key={n} id={`arrow-${n.replace(/\W/g, '')}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={col} opacity="0.85" />
          </marker>
        ))}
      </defs>

      {[...edges.values()].map((e, i) => {
        const a = pos.get(e.from)!, b = pos.get(e.to)!;
        const col = colors.get(e.from)!;
        // 노드 반지름만큼 양끝을 줄이고, 중심 반대쪽으로 살짝 휘는 곡선
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const sx = a.x + (dx / len) * 30, sy = a.y + (dy / len) * 30;
        const ex = b.x - (dx / len) * 34, ey = b.y - (dy / len) * 34;
        const mx = (sx + ex) / 2, my = (sy + ey) / 2;
        const nx = -dy / len, ny = dx / len; // 법선
        const bend = edges.has(`${e.to}→${e.from}`) ? 22 : 10; // 쌍방이면 더 휘어 겹침 방지
        const qx = mx + nx * bend, qy = my + ny * bend;
        const lx = mx + nx * (bend + 10), ly = my + ny * (bend + 10);
        return (
          <g key={i}>
            <path
              d={`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`}
              fill="none"
              stroke={col}
              strokeWidth={e.turning ? 2 : 1.2}
              strokeDasharray={e.turning ? undefined : '4 3'}
              opacity="0.7"
              markerEnd={`url(#arrow-${e.from.replace(/\W/g, '')})`}
            />
            {e.emotion && (
              <text x={lx} y={ly} textAnchor="middle" fontSize="10" fill={col} opacity="0.95">
                {e.emotion.slice(0, 12)}
              </text>
            )}
          </g>
        );
      })}

      {chars.map((c) => {
        const p = pos.get(c.name)!;
        const col = colors.get(c.name)!;
        return (
          <g key={c.name}>
            <circle cx={p.x} cy={p.y} r="24" fill={col} opacity="0.16" />
            <circle cx={p.x} cy={p.y} r="24" fill="none" stroke={col} strokeWidth="1.5" />
            {/* 사람 아이콘 */}
            <circle cx={p.x} cy={p.y - 6} r="6" fill={col} />
            <path d={`M${p.x - 10},${p.y + 13} a10 10 0 0 1 20 0 z`} fill={col} />
            <text x={p.x} y={p.y + 42} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
              {c.name}
            </text>
            {c.role && (
              <text x={p.x} y={p.y + 57} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.55">
                {String(c.role).slice(0, 22)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 단계 0.5: 시놉시스 대조 ──────────────────────────────
function Step05({ out }: { out: any }) {
  const list = out.divergences ?? [];
  return (
    <Section title={`시놉시스와 갈라진 지점`} sub={`${list.length}건 — 갈라짐은 결함이 아니라 확인 대상`}>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">갈라진 지점이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((d: any, i: number) => (
            <div key={i} className="rounded-lg border bg-background/60 p-3 text-sm">
              <p className="font-semibold">{d.item}</p>
              <p className="mt-1 text-xs"><span className="text-muted-foreground">시놉시스</span> {d.synopsis_state}</p>
              <p className="text-xs"><span className="text-muted-foreground">원고</span> {d.manuscript_state}</p>
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
    return colors.get(n) ?? '#64748b';
  };

  return (
    <div className="space-y-4">
      {chars.length > 0 && (
        <Section title="인물 관계도" sub="선 = 감정이 향하는 방향 (실선 = 전환점을 지난 관계)">
          <CharacterGraph characters={chars} arcs={out.emotion_arcs ?? []} />
        </Section>
      )}

      {out.scenes?.length > 0 && (
        <Section title={`장면 ${out.scenes.length}개`} sub="카드 색 = 첫 등장 인물">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {out.scenes.map((s: any, i: number) => {
              const col = sceneColor(s);
              return (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ backgroundColor: `${col}0d`, border: `1px solid ${col}30` }}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-semibold" style={{ color: col }}>{s.scene_id}</span>
                  <span>{s.loc}</span>
                </div>
                <p className="mt-1.5 text-sm leading-snug">{s.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(s.characters ?? []).map((n: string, j: number) => {
                    const key = matchCharacter(n, names) ?? n;
                    const ccol = colors.get(key) ?? '#64748b';
                    return (
                      <span key={j} className="inline-flex items-center gap-1 rounded-full bg-background/50 px-1.5 py-px text-[10px] text-foreground/80">
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
        <Section title="설정 추출" sub="충돌·공백은 판정 카드(6단계)에서 작가 질문으로 이어집니다">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.settings.map((s: any, i: number) => {
              const sc = statusColor(s.status);
              return (
                <div key={i} className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-px text-[10px] font-semibold ${sc.badge}`}>{s.status}</span>
                    <span className="text-sm font-semibold">{s.title}</span>
                    {s.plot_depends && <span className="text-[10px] text-muted-foreground">플롯 의존</span>}
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {(s.values ?? []).map((v: any, j: number) => (
                      <li key={j} className="text-xs text-muted-foreground">
                        <span className="text-foreground/70">{v.loc}</span> {v.value}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {out.emotion_arcs?.length > 0 && (
        <Section title="인물별 감정 흐름" sub="진한 칩 = 강 / 테두리만 = 약 · 큰 칩 = 전환점 (아래 줄 = 전환의 계기)">
          <div className="space-y-4">
            {out.emotion_arcs.map((arc: any, i: number) => {
              const key = matchCharacter(arc.character, names) ?? arc.character;
              const col = colors.get(key) ?? '#64748b';
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
                          <div className="max-w-[160px]">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 ${p.is_turning_point ? 'text-[12px] font-bold' : 'text-[11px]'}`}
                              style={{
                                backgroundColor: strong ? `${col}38` : weak ? 'transparent' : `${col}20`,
                                border: `1px ${p.is_turning_point ? 'solid' : 'dashed'} ${col}${p.is_turning_point ? '' : '80'}`,
                                color: col,
                              }}
                              title={`${p.loc ?? ''} ${p.target ? '→ ' + p.target : ''}`}
                            >
                              {p.emotion}
                            </span>
                            {p.is_turning_point && p.trigger && (
                              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">⚡ {p.trigger}</p>
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
        <Section title="인물별 지식 상태" sub="장면이 끝날 때 무엇을 알고 · 믿고 · 모르는가">
          <div className="space-y-3">
            {names
              .filter((n: string) => (out.knowledge_states ?? []).some((k: any) => matchCharacter(k.character, names) === n))
              .map((n: string) => {
                const col = colors.get(n) ?? '#64748b';
                const rows = (out.knowledge_states ?? []).filter((k: any) => matchCharacter(k.character, names) === n);
                return (
                  <div key={n} className="rounded-lg border bg-background/60 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                      {n}
                    </p>
                    <div className="space-y-2">
                      {rows.map((k: any, i: number) => (
                        <div key={i} className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[90px_1fr]">
                          <span className="font-mono text-muted-foreground">{k.scene_id} {k.loc}</span>
                          <div className="space-y-0.5">
                            {k.knows?.length > 0 && <p><span className="mr-1 rounded bg-emerald-500/15 px-1 text-[10px] text-emerald-300">안다</span>{k.knows.join(' · ')}</p>}
                            {k.believes?.length > 0 && <p><span className="mr-1 rounded bg-sky-500/15 px-1 text-[10px] text-sky-300">믿는다</span>{k.believes.join(' · ')}</p>}
                            {k.does_not_know?.length > 0 && <p className="text-muted-foreground"><span className="mr-1 rounded bg-zinc-500/20 px-1 text-[10px] text-zinc-400">모른다</span>{k.does_not_know.join(' · ')}</p>}
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
              <div key={i} className="rounded-lg border bg-background/60 p-3 text-sm">
                <p className="font-semibold">🔁 {d.name}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground/70">{d.first?.loc}</span> “{d.first?.quote}”
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
          <ul className="space-y-1.5 text-sm">
            {out.timeline.map((t: any, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">🕐</span>
                <div>{t.note}<EvidenceList evidence={t.evidence} /></div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
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
            <div key={i} className="rounded-lg border bg-background/60 p-3">
              <p className="text-[11px] text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-sm font-bold leading-snug">{t.value}</p>
            </div>
          ))}
        </div>
        {p.promises?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {p.promises.map((x: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.genre_signals?.length > 0 && (
        <Section title="장르 신호" sub="웃음·긴장이 만들어지는 기제">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {p.genre_signals.map((g: any, i: number) => (
              <div key={i} className="rounded-lg border bg-background/60 p-3 text-sm">
                <p className="font-semibold">{g.signal}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{g.mechanism}</p>
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
              <span key={i} className="rounded-md border bg-background/60 px-2 py-0.5 text-xs">
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
    <Section title={`심어둔 것 (planted) ${out.planted.length}건`} sub="다음 부에서 격발되는지 추적">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {out.planted.map((p: any, i: number) => (
          <div key={i} className="rounded-lg border bg-background/60 p-3 text-sm">
            <p className="font-semibold">🌱 {p.name} <span className="text-xs font-normal text-muted-foreground">({p.loc})</span></p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">“{p.quote}”</p>
            <p className="mt-1 text-xs"><span className="text-primary">→</span> {p.expected_fire}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── 단계 6 보조: 총평·A급·작가 질문 (설정 항목은 판정 카드가 담당) ──
function Step6Extra({ out }: { out: any }) {
  const kinds: Record<string, { label: string; cls: string }> = {
    confirm: { label: '확인', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
    choose: { label: '고를 것', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
    reference: { label: '참고', cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' },
  };
  return (
    <div className="space-y-4">
      {out.summary && (
        <section className="rounded-xl border-2 border-primary/50 bg-primary/5 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-primary">
            총평
            {out.intervention && (
              <Badge variant={out.intervention === 'redesign' ? 'destructive' : 'secondary'}>
                {out.intervention === 'redesign' ? '재설계형' : '비평형'}
              </Badge>
            )}
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{out.summary}</p>
        </section>
      )}

      {out.overall && (
        <Section title="작품 단위 평가">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.overall.logline && (
              <div className="rounded-lg border bg-background/60 p-3 sm:col-span-2">
                <p className="text-[11px] text-muted-foreground">한 문장으로</p>
                <p className="mt-1 text-sm font-bold">{out.overall.logline}</p>
              </div>
            )}
            {out.overall.protagonist_arc && (
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-[11px] text-muted-foreground">주인공의 궤적</p>
                <p className="mt-1 text-sm leading-relaxed">{out.overall.protagonist_arc}</p>
              </div>
            )}
            {out.overall.structure && (
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-[11px] text-muted-foreground">구조와 주제</p>
                <p className="mt-1 text-sm leading-relaxed">{out.overall.structure}</p>
              </div>
            )}
            {out.overall.readability_pattern && (
              <div className="rounded-lg border bg-background/60 p-3 sm:col-span-2">
                <p className="text-[11px] text-muted-foreground">읽히는 장면의 공통점</p>
                <p className="mt-1 text-sm leading-relaxed">{out.overall.readability_pattern}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {out.intervention === 'redesign' && out.redesign && (
        <Section title="재설계 제안" sub="구조가 아직 서지 않은 원고로 판정됨 — 설계 수준의 수정안">
          <div className="space-y-3 text-sm">
            {out.redesign.theme && (
              <p><Badge variant="destructive" className="mr-2">테마 재정의</Badge>{out.redesign.theme}</p>
            )}
            {out.redesign.title_proposal && (
              <p>
                <Badge variant="secondary" className="mr-2">제목 제안</Badge>
                {Array.isArray(out.redesign.title_proposal) ? out.redesign.title_proposal.join(' / ') : out.redesign.title_proposal}
              </p>
            )}
            {out.redesign.chapter_template && (
              <p><Badge variant="secondary" className="mr-2">꼭지 템플릿</Badge>{out.redesign.chapter_template}</p>
            )}
            {out.redesign.toc_proposal?.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold">목차 수정안</p>
                <div className="space-y-1.5">
                  {out.redesign.toc_proposal.map((t: any, i: number) => (
                    <div key={i} className="grid gap-1 rounded-lg border bg-background/60 p-2.5 text-xs sm:grid-cols-[1fr_auto_1fr]">
                      <span className="text-muted-foreground line-through decoration-muted-foreground/40">{t.current}</span>
                      <span className="hidden text-primary sm:block">→</span>
                      <span className="font-semibold whitespace-pre-wrap">{t.proposed}</span>
                      {t.why && <p className="text-muted-foreground sm:col-span-3">∵ {t.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {out.redesign.term_table?.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold">용어·은유 통일표</p>
                {out.redesign.term_table.map((t: any, i: number) => (
                  <p key={i} className="mb-1 border-l-2 border-primary/40 pl-2 text-xs">
                    {t.from} → <b>{t.to}</b> <span className="text-muted-foreground">({t.why})</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.prescriptions?.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold">수치 처방</p>
                {out.redesign.prescriptions.map((p: any, i: number) => (
                  <p key={i} className="mb-1 border-l-2 border-primary/40 pl-2 text-xs">
                    {p.what}: <b>{p.value}</b> <span className="text-muted-foreground">— {p.basis}</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.synopsis_sketch && (
              <div>
                <p className="mb-1.5 font-semibold">개정 서사 골격</p>
                <p className="whitespace-pre-wrap rounded-lg border bg-background/60 p-3 text-xs leading-relaxed">{out.redesign.synopsis_sketch}</p>
              </div>
            )}
            {out.redesign.references?.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold">실존 모델·참고자료</p>
                {out.redesign.references.map((r: any, i: number) => (
                  <p key={i} className="mb-1 border-l-2 border-primary/40 pl-2 text-xs">
                    {r.target}: <b>{r.model}</b> <span className="text-muted-foreground">— {r.how}</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.timeline_proposal?.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold">인물×시간 연표 제안</p>
                <div className="space-y-1">
                  {out.redesign.timeline_proposal.map((t: any, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="w-20 shrink-0 font-mono text-muted-foreground">{t.year}</span>
                      <div>
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
        <Section title="확실히 좋아서 더 살리고 싶은 것 — 인물별">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {out.character_reviews.map((c: any, i: number) => {
              const col = CHAR_COLORS[i % CHAR_COLORS.length];
              return (
                <div key={i} className="rounded-lg border bg-background/60 p-3 text-sm">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                    {c.label || c.character}
                  </p>
                  {c.core_mechanism && <p className="mt-1 text-xs text-muted-foreground">핵심 기제 — {c.core_mechanism}</p>}
                  {c.shining?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-emerald-300">✨ 빛나는 순간</p>
                      {c.shining.map((s: any, j: number) => (
                        <p key={j} className="mt-0.5 text-xs text-muted-foreground">· {s.loc} — {s.why}</p>
                      ))}
                    </div>
                  )}
                  {c.wobbles?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-amber-300">⚠ 흔들리는 지점</p>
                      {c.wobbles.map((w: any, j: number) => (
                        <p key={j} className="mt-0.5 text-xs text-muted-foreground">· {w.loc} — {w.problem} <span className="text-foreground/70">→ {w.direction}</span></p>
                      ))}
                    </div>
                  )}
                  {c.emotion_note && <p className="mt-2 text-xs">감정 흐름: {c.emotion_note}</p>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {out.a_grade?.length > 0 && (
        <Section title={`가장 큰 것 (A급) ${out.a_grade.length}건`} sub="구조를 흔드는 문제 — 1~3건만 고릅니다">
          <div className="space-y-2.5">
            {out.a_grade.map((a: any, i: number) => (
              <div key={i} className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 font-bold text-red-300">{i + 1}</span>
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="mt-1 leading-relaxed">{a.problem}</p>
                  <p className="mt-1 text-muted-foreground">→ {a.direction}</p>
                  <EvidenceList evidence={a.evidence} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.author_questions?.length > 0 && (
        <Section title={`작가 질문 ${out.author_questions.length}건`}>
          <div className="space-y-1.5 text-sm">
            {out.author_questions.map((q: any, i: number) => {
              const k = kinds[q.kind] ?? { label: q.kind, cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40' };
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] ${k.cls}`}>{k.label}</span>
                  <div>
                    {q.question}
                    {q.options?.length > 0 && (
                      <span className="text-xs text-muted-foreground"> (후보: {q.options.join(' / ')})</span>
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
