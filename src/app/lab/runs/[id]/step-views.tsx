'use client';

// 단계별 읽기 뷰 — 판정 항목(lab_items)이 커버하지 않는 산출물을 사람이 읽을 수 있게 렌더링
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EvidenceList({ evidence }: { evidence: any[] }) {
  if (!evidence?.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {evidence.map((e, i) => (
        <li key={i} className="text-xs text-muted-foreground border-l-2 pl-2">
          <span className="font-medium">{e.loc}</span> “{e.quote}”
          {e._evidence_valid === false && (
            <Badge variant="destructive" className="ml-1 text-[10px]">인용 검증 실패</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-muted-foreground font-normal py-1 pr-3 align-top">{children}</th>
);
const Td = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <td className={`py-1.5 pr-3 align-top border-t ${className}`}>{children}</td>
);

function statusBadge(status?: string) {
  if (!status) return null;
  const v = status === '충돌' ? 'destructive' : status === '공백' ? 'secondary' : 'outline';
  return <Badge variant={v as any}>{status}</Badge>;
}

// ── 단계 0.5: 시놉시스 대조 ──────────────────────────────
function Step05({ out }: { out: any }) {
  const list = out.divergences ?? [];
  return (
    <Section title={`시놉시스와 갈라진 지점 ${list.length}건`}>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">갈라진 지점이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {list.map((d: any, i: number) => (
            <div key={i} className="text-sm">
              <p className="font-medium">{d.item}</p>
              <p className="text-muted-foreground">시놉시스: {d.synopsis_state}</p>
              <p className="text-muted-foreground">원고: {d.manuscript_state}</p>
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
  return (
    <div className="space-y-4">
      {out.characters?.length > 0 && (
        <Section title="인물">
          <div className="flex flex-wrap gap-2">
            {out.characters.map((c: any, i: number) => (
              <span key={i} className="text-sm border rounded px-2 py-1">
                <b>{c.name}</b>
                {c.role ? <span className="text-muted-foreground"> — {c.role}</span> : null}
              </span>
            ))}
          </div>
        </Section>
      )}

      {out.scenes?.length > 0 && (
        <Section title={`장면 ${out.scenes.length}개`}>
          <table className="w-full text-sm">
            <thead>
              <tr><Th>#</Th><Th>쪽</Th><Th>등장</Th><Th>요약</Th></tr>
            </thead>
            <tbody>
              {out.scenes.map((s: any, i: number) => (
                <tr key={i}>
                  <Td>{s.scene_id}</Td>
                  <Td><span className="whitespace-nowrap">{s.loc}</span></Td>
                  <Td>{(s.characters ?? []).join(', ')}</Td>
                  <Td>{s.summary}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {out.settings?.length > 0 && (
        <Section title="설정 추출">
          <table className="w-full text-sm">
            <thead>
              <tr><Th>항목</Th><Th>상태</Th><Th>원고가 말한 값</Th></tr>
            </thead>
            <tbody>
              {out.settings.map((s: any, i: number) => (
                <tr key={i}>
                  <Td><b>{s.title}</b>{s.plot_depends ? <span className="text-xs text-muted-foreground"> · 플롯 의존</span> : null}</Td>
                  <Td>{statusBadge(s.status)}</Td>
                  <Td>
                    {(s.values ?? []).map((v: any, j: number) => (
                      <p key={j}>
                        {v.value} <span className="text-xs text-muted-foreground">({v.loc})</span>
                      </p>
                    ))}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {out.knowledge_states?.length > 0 && (
        <Section title="인물별 지식 상태표">
          <table className="w-full text-sm">
            <thead>
              <tr><Th>인물</Th><Th>장면/쪽</Th><Th>아는 것</Th><Th>믿는 것</Th><Th>모르는 것</Th></tr>
            </thead>
            <tbody>
              {out.knowledge_states.map((k: any, i: number) => (
                <tr key={i}>
                  <Td><b>{k.character}</b></Td>
                  <Td><span className="whitespace-nowrap">{k.scene_id} {k.loc}</span></Td>
                  <Td>{(k.knows ?? []).join(' · ')}</Td>
                  <Td>{(k.believes ?? []).join(' · ')}</Td>
                  <Td className="text-muted-foreground">{(k.does_not_know ?? []).join(' · ')}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {out.emotion_arcs?.length > 0 && (
        <Section title="인물별 감정 흐름">
          <div className="space-y-4">
            {out.emotion_arcs.map((arc: any, i: number) => (
              <div key={i}>
                <p className="font-medium text-sm mb-1">{arc.character}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(arc.points ?? []).map((p: any, j: number) => (
                    <span
                      key={j}
                      className={`text-xs rounded px-1.5 py-0.5 border ${
                        p.is_turning_point ? 'border-primary font-medium' : 'text-muted-foreground'
                      }`}
                      title={p.trigger || ''}
                    >
                      {p.loc} {p.emotion}
                      {p.is_turning_point && p.trigger ? ` ← ${p.trigger}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">테두리 강조 = 전환점 (← 뒤는 전환의 계기)</p>
        </Section>
      )}

      {out.devices?.length > 0 && (
        <Section title="반복 장치">
          <div className="space-y-2 text-sm">
            {out.devices.map((d: any, i: number) => (
              <div key={i}>
                <b>{d.name}</b>
                <p className="text-xs text-muted-foreground">
                  첫 등장 {d.first?.loc} “{d.first?.quote}”
                  {(d.recurrences ?? []).map((r: any, j: number) => ` → ${r.loc}`).join('')}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {out.timeline?.length > 0 && (
        <Section title="타임라인 메모">
          <ul className="list-disc pl-5 text-sm space-y-1">
            {out.timeline.map((t: any, i: number) => (
              <li key={i}>{t.note}<EvidenceList evidence={t.evidence} /></li>
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
  return (
    <div className="space-y-4">
      <Section title="원고의 약속">
        <table className="w-full text-sm">
          <tbody>
            <tr><Td>시점</Td><Td><b>{p.pov}</b></Td></tr>
            <tr><Td>시제</Td><Td><b>{p.tense}</b></Td></tr>
            <tr><Td>장면·대화·요약 비율</Td><Td><b>{p.scene_dialogue_summary_ratio}</b></Td></tr>
            <tr><Td>서술자의 논평 대상</Td><Td><b>{p.narrator_target}</b></Td></tr>
          </tbody>
        </table>
        {p.promises?.length > 0 && (
          <ul className="list-disc pl-5 text-sm mt-3 space-y-1">
            {p.promises.map((x: string, i: number) => <li key={i}>{x}</li>)}
          </ul>
        )}
      </Section>

      {p.genre_signals?.length > 0 && (
        <Section title="장르 신호">
          <div className="space-y-2 text-sm">
            {p.genre_signals.map((g: any, i: number) => (
              <div key={i}>
                <b>{g.signal}</b> <span className="text-muted-foreground">— {g.mechanism}</span>
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
              <span key={i} className="text-xs border rounded px-1.5 py-0.5">
                {f.scene_id}: <b>{f.character}</b>
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
    <Section title={`심어둔 것 (planted) ${out.planted.length}건 — 다음 부에서 격발 추적`}>
      <div className="space-y-2 text-sm">
        {out.planted.map((p: any, i: number) => (
          <div key={i}>
            <b>{p.name}</b> <span className="text-xs text-muted-foreground">({p.loc})</span>
            <p className="text-xs text-muted-foreground">“{p.quote}” → {p.expected_fire}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── 단계 6 보조: 총평·A급·작가 질문 (설정 항목은 판정 카드가 담당) ──
function Step6Extra({ out }: { out: any }) {
  const kinds: Record<string, string> = { confirm: '확인', choose: '고를 것', reference: '참고' };
  return (
    <div className="space-y-4">
      {out.summary && (
        <Section title="총평">
          <p className="text-sm whitespace-pre-wrap">{out.summary}</p>
        </Section>
      )}
      {out.overall && (
        <Section title="작품 단위 평가">
          <table className="w-full text-sm">
            <tbody>
              {out.overall.logline && <tr><Td>한 문장으로</Td><Td><b>{out.overall.logline}</b></Td></tr>}
              {out.overall.protagonist_arc && <tr><Td>주인공의 궤적</Td><Td>{out.overall.protagonist_arc}</Td></tr>}
              {out.overall.structure && <tr><Td>구조와 주제</Td><Td>{out.overall.structure}</Td></tr>}
              {out.overall.readability_pattern && <tr><Td>읽히는 장면의 공통점</Td><Td>{out.overall.readability_pattern}</Td></tr>}
            </tbody>
          </table>
        </Section>
      )}
      {out.intervention === 'redesign' && out.redesign && (
        <Section title="재설계 제안 (구조가 아직 서지 않은 원고로 판정됨)">
          <div className="space-y-3 text-sm">
            {out.redesign.theme && (
              <p><Badge variant="destructive" className="mr-2">테마 재정의</Badge>{out.redesign.theme}</p>
            )}
            {out.redesign.toc_proposal?.length > 0 && (
              <div>
                <p className="font-medium mb-1">목차 수정안</p>
                <table className="w-full text-xs">
                  <thead><tr><Th>기존</Th><Th>제안</Th><Th>이유</Th></tr></thead>
                  <tbody>
                    {out.redesign.toc_proposal.map((t: any, i: number) => (
                      <tr key={i}><Td>{t.current}</Td><Td><b>{t.proposed}</b></Td><Td>{t.why}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {out.redesign.term_table?.length > 0 && (
              <div>
                <p className="font-medium mb-1">용어·은유 통일표</p>
                {out.redesign.term_table.map((t: any, i: number) => (
                  <p key={i} className="text-xs border-l-2 pl-2 mb-1">{t.from} → <b>{t.to}</b> <span className="text-muted-foreground">({t.why})</span></p>
                ))}
              </div>
            )}
            {out.redesign.prescriptions?.length > 0 && (
              <div>
                <p className="font-medium mb-1">수치 처방</p>
                {out.redesign.prescriptions.map((p: any, i: number) => (
                  <p key={i} className="text-xs border-l-2 pl-2 mb-1">{p.what}: <b>{p.value}</b> <span className="text-muted-foreground">— {p.basis}</span></p>
                ))}
              </div>
            )}
            {out.redesign.synopsis_sketch && (
              <div>
                <p className="font-medium mb-1">개정 서사 골격</p>
                <p className="text-xs whitespace-pre-wrap">{out.redesign.synopsis_sketch}</p>
              </div>
            )}
            {out.redesign.references?.length > 0 && (
              <div>
                <p className="font-medium mb-1">실존 모델·참고자료</p>
                {out.redesign.references.map((r: any, i: number) => (
                  <p key={i} className="text-xs border-l-2 pl-2 mb-1">
                    {r.target}: <b>{r.model}</b> <span className="text-muted-foreground">— {r.how}</span>
                  </p>
                ))}
              </div>
            )}
            {out.redesign.timeline_proposal?.length > 0 && (
              <div>
                <p className="font-medium mb-1">인물×연도 연표 제안</p>
                <table className="w-full text-xs">
                  <thead><tr><Th>연도</Th><Th>인물별 사건</Th></tr></thead>
                  <tbody>
                    {out.redesign.timeline_proposal.map((t: any, i: number) => (
                      <tr key={i}>
                        <Td><span className="whitespace-nowrap">{t.year}</span></Td>
                        <Td>
                          {(t.entries ?? []).map((e: any, j: number) => (
                            <p key={j}><b>{e.character}</b> — {e.event}</p>
                          ))}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>
      )}
      {out.character_reviews?.length > 0 && (
        <Section title="확실히 좋아서 더 살리고 싶은 것 — 인물별">
          <div className="space-y-3">
            {out.character_reviews.map((c: any, i: number) => (
              <div key={i} className="text-sm border rounded p-3 space-y-1.5">
                <p className="font-medium">{c.label || c.character}</p>
                {c.core_mechanism && <p className="text-muted-foreground">핵심 기제: {c.core_mechanism}</p>}
                {c.shining?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">빛나는 순간</p>
                    {c.shining.map((s: any, j: number) => (
                      <p key={j} className="text-xs text-muted-foreground">· {s.loc} — {s.why}</p>
                    ))}
                  </div>
                )}
                {c.wobbles?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">일관성이 흔들리는 지점</p>
                    {c.wobbles.map((w: any, j: number) => (
                      <p key={j} className="text-xs text-muted-foreground">· {w.loc} — {w.problem} → {w.direction}</p>
                    ))}
                  </div>
                )}
                {c.emotion_note && <p className="text-xs">감정 흐름: {c.emotion_note}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {out.a_grade?.length > 0 && (
        <Section title={`가장 큰 것 (A급) ${out.a_grade.length}건`}>
          <div className="space-y-3">
            {out.a_grade.map((a: any, i: number) => (
              <div key={i} className="text-sm border rounded p-3">
                <p className="font-medium">{i + 1}. {a.title}</p>
                <p className="mt-1">{a.problem}</p>
                <p className="text-muted-foreground mt-1">→ {a.direction}</p>
                <EvidenceList evidence={a.evidence} />
              </div>
            ))}
          </div>
        </Section>
      )}
      {out.author_questions?.length > 0 && (
        <Section title={`작가 질문 ${out.author_questions.length}건`}>
          <div className="space-y-2 text-sm">
            {out.author_questions.map((q: any, i: number) => (
              <div key={i}>
                <Badge variant="outline" className="mr-2">{kinds[q.kind] ?? q.kind}</Badge>
                {q.question}
                {q.options?.length > 0 && (
                  <span className="text-xs text-muted-foreground"> (후보: {q.options.join(' / ')})</span>
                )}
              </div>
            ))}
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
