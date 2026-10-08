'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { StepOutputView, EvidenceList } from './step-views';
import { estimateCost } from '@/lib/lab/pricing';

const STEP_LABEL: Record<string, string> = {
  '0.5': '시놉시스 대조',
  '1': '구조화',
  '2': '문체',
  '3': '장점',
  '4': '결함',
  '5': '물음표',
  '6': '방향',
};

const TYPE_LABEL: Record<string, string> = {
  strength: '장점',
  issue: '결함',
  question: '질문',
  setting: '설정',
  line_edit: '첨삭',
};

/** 카드 왼쪽 색 띠 — 유형·등급별 구분 */
function accentOf(item: Item): string {
  const p = item.payload;
  if (item.item_type === 'strength') return '#34d399';
  if (item.item_type === 'issue') return p.grade === 'A' ? '#f87171' : p.grade === 'B' ? '#fbbf24' : '#94a3b8';
  if (item.item_type === 'line_edit') return '#a78bfa';
  if (item.item_type === 'question') return '#22d3ee';
  if (item.item_type === 'setting') return p.status === '충돌' ? '#f87171' : p.status === '공백' ? '#fbbf24' : '#34d399';
  return '#64748b';
}

interface Item {
  id: string;
  step: string;
  item_type: string;
  payload: any;
  lab_verdicts: { verdict: string; reason: string | null } | { verdict: string; reason: string | null }[] | null;
}

function verdictOf(item: Item): { verdict: string; reason: string | null } | null {
  const v = item.lab_verdicts;
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** 화면에서 모아두는 판정 (저장 전) */
interface StagedVerdict {
  verdict: 'adopted' | 'rejected' | 'disputed';
  reason?: string;
}

const STAGED_LABEL: Record<string, string> = { adopted: '채택 예정', rejected: '기각 예정', disputed: '이견 예정' };

function ItemCard({
  item,
  staged,
  onStage,
}: {
  item: Item;
  staged: StagedVerdict | undefined;
  onStage: (itemId: string, verdict: StagedVerdict | null) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const v = verdictOf(item);
  const p = item.payload;

  const title =
    item.item_type === 'line_edit'
      ? `${p.kind ?? '첨삭'} (${p.loc ?? '쪽 미상'})`
      : p.type_name || p.title || p.rule_id ? `${p.rule_id ?? ''} ${p.type_name ?? p.title ?? ''}`.trim() : p.question?.slice(0, 60) || item.item_type;

  const stage = (verdict: StagedVerdict['verdict'], r?: string) => {
    onStage(item.id, { verdict, reason: r });
    setRejecting(false);
    setReason('');
  };

  return (
    <Card className={v ? 'opacity-80' : ''} style={{ borderLeft: `4px solid ${accentOf(item)}` }}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{TYPE_LABEL[item.item_type]}</Badge>
              {p.grade && <Badge variant={p.grade === 'A' ? 'destructive' : 'secondary'}>{p.grade}급</Badge>}
              {p.status && <Badge variant="secondary">{p.status}</Badge>}
              <span className="font-medium text-sm">{title}</span>
            </div>
            <p className="text-sm mt-1">
              {p.diagnosis || p.mechanism || p.question || p.protect || p.comment || ''}
            </p>
            {item.item_type === 'line_edit' && (
              <div className="mt-1 space-y-0.5 text-xs">
                {p.quote && <p className="text-muted-foreground border-l-2 pl-2">원문: “{p.quote}”</p>}
                {p.suggestion && <p className="border-l-2 border-primary pl-2">제안: “{p.suggestion}”</p>}
              </div>
            )}
            {p.direction && <p className="text-sm text-muted-foreground">→ {p.direction}</p>}
            {item.item_type === 'setting' && p.values?.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {p.values.map((v: any, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground border-l-2 pl-2">
                    <span className="font-medium">{v.loc}</span> {v.value ?? v.quote ?? ''}
                  </li>
                ))}
              </ul>
            )}
            <EvidenceList evidence={p.evidence ?? p.quotes ?? []} />
          </div>
          <div className="shrink-0">
            {v ? (
              <Badge variant={v.verdict === 'adopted' ? 'default' : v.verdict === 'rejected' ? 'destructive' : 'secondary'}>
                {{ adopted: '채택', rejected: '기각', disputed: '이견' }[v.verdict] ?? v.verdict}
              </Badge>
            ) : staged ? (
              <div className="flex items-center gap-1.5">
                <Badge variant={staged.verdict === 'adopted' ? 'default' : staged.verdict === 'rejected' ? 'destructive' : 'secondary'}>
                  {STAGED_LABEL[staged.verdict]}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => onStage(item.id, null)}>취소</Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => stage('adopted')}>채택</Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(!rejecting)}>기각</Button>
                <Button size="sm" variant="secondary" onClick={() => stage('disputed')}>이견</Button>
              </div>
            )}
          </div>
        </div>
        {v?.reason && <p className="text-xs text-muted-foreground">기각 사유: {v.reason}</p>}
        {staged?.verdict === 'rejected' && staged.reason && !v && (
          <p className="text-xs text-muted-foreground">기각 사유(대기): {staged.reason}</p>
        )}
        {rejecting && !v && !staged && (
          <div className="flex gap-2">
            <Textarea rows={1} placeholder="기각 이유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" disabled={!reason.trim()} onClick={() => stage('rejected', reason)}>
              확정
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ run: any; steps: any[]; items: Item[] } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [resumeNotice, setResumeNotice] = useState('');

  const load = useCallback(
    () =>
      fetch(`/api/lab/runs/${id}`)
        .then((r) => r.json())
        .then(setData),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // 판정은 로컬에 모았다가(staged) 일괄 저장한다 — 클릭마다 서버에 쓰지 않는다
  const [staged, setStaged] = useState<Record<string, StagedVerdict>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleStage = (itemId: string, verdict: StagedVerdict | null) => {
    setStaged((prev) => {
      const next = { ...prev };
      if (verdict) next[itemId] = verdict;
      else delete next[itemId];
      return next;
    });
  };

  const handleBatchSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/lab/verdicts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdicts: Object.entries(staged).map(([item_id, v]) => ({ item_id, verdict: v.verdict, reason: v.reason })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(body?.error ?? '일괄 저장에 실패했습니다.');
        return;
      }
      setStaged({});
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    setResumeNotice('');
    try {
      let done = false;
      while (!done) {
        const res = await fetch(`/api/lab/runs/${id}/advance`, { method: 'POST' });
        let adv: any = null;
        try {
          adv = await res.json();
        } catch {
          adv = null;
        }
        if (!res.ok || !adv) {
          setResumeNotice(
            '⏱ 서버 처리 시간 한도(300초)를 초과한 것으로 보입니다. [이어서 실행]을 다시 누르면 중단된 단계를 처음부터 재시도합니다.'
          );
          break;
        }
        if (adv.resumed) {
          setResumeNotice(`⏱ 단계 ${adv.step}의 직전 시도가 시간 한도로 중단되어 처음부터 다시 실행했습니다.`);
        }
        if (adv.error) {
          setResumeNotice(`단계 ${adv.step ?? '?'} 실패: ${adv.error}`);
          break;
        }
        done = adv.done;
        await load();
      }
    } finally {
      setResuming(false);
      await load();
    }
  };

  if (!data) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  const { run, steps, items } = data;
  const stepOrder = steps.map((s) => s.step).sort((a, b) => parseFloat(a) - parseFloat(b));
  const judged = items.filter((i) => verdictOf(i)).length;
  const stagedCount = Object.keys(staged).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">
          {run.lab_manuscripts?.title}
          {run.lab_manuscripts?.part_label ? ` (${run.lab_manuscripts.part_label})` : ''} · 모드 {run.mode}
        </h1>
        <Badge variant={run.status === 'done' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
          {{ pending: '대기', running: '실행 중', done: '완료', failed: '실패' }[run.status as string] ?? run.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          판정 {judged}/{items.length}
        </span>
        <div className="ml-auto flex gap-2">
          {(run.status === 'failed' || run.status === 'running' || run.status === 'pending') && (
            <Button size="sm" onClick={handleResume} disabled={resuming}>
              {resuming ? <Loader2 className="h-4 w-4 animate-spin" /> : '이어서 실행'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowJson(!showJson)}>
            {showJson ? '읽기 뷰' : 'JSON'}
          </Button>
        </div>
      </div>

      {resumeNotice && (
        <p className="text-sm rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2">{resumeNotice}</p>
      )}

      <p className="text-xs text-muted-foreground">
        버전 — 에이전트: {run.versions?.agent ?? 'FA-0.8 이전'} / 모델: {run.versions?.model ?? 'gemini-2.5-flash'} / 프로토콜: {run.versions?.protocol} / 규칙: {run.versions?.rules} / 프롬프트: {run.versions?.prompts} / 작가 컨텍스트: {run.versions?.author_context ?? '—'}
        {run.metrics?.tokens && (
          <>
            {' '}/ 비용(대략): {estimateCost(run.versions?.model, run.metrics.tokens)?.formula}
            {' '}(약 {estimateCost(run.versions?.model, run.metrics.tokens)?.krw.toLocaleString('ko-KR')}원)
          </>
        )}
      </p>

      <Tabs defaultValue={stepOrder[0]}>
        <TabsList>
          {stepOrder.map((s) => {
            const st = steps.find((x) => x.step === s);
            return (
              <TabsTrigger key={s} value={s}>
                {s} {STEP_LABEL[s]}
                {st?.status === 'failed' && ' ⚠'}
                {st?.status !== 'done' && st?.status !== 'failed' && ' …'}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {stepOrder.map((s) => {
          const st = steps.find((x) => x.step === s);
          const stepItems = items.filter((i) => i.step === s);
          return (
            <TabsContent key={s} value={s} className="space-y-3">
              {st?.status === 'failed' && (
                <p className="text-sm text-destructive">실행 실패: {st.error}</p>
              )}
              {st?.status === 'running' && st?.error && (
                <p className="text-sm rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2">{st.error}</p>
              )}
              {showJson ? (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[70vh]">
                  {JSON.stringify(st?.output ?? null, null, 2)}
                </pre>
              ) : st?.output ? (
                <>
                  <StepOutputView step={s} output={st.output} />
                  {stepItems.length > 0 && (
                    <div className="space-y-3">
                      {['4', '5'].includes(s) === false && stepItems.length > 0 && (
                        <p className="text-sm font-medium text-muted-foreground mt-2">판정 항목</p>
                      )}
                      {stepItems.map((it) => (
                        <ItemCard key={it.id} item={it} staged={staged[it.id]} onStage={handleStage} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">아직 산출물이 없습니다.</p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {stagedCount > 0 && (
        <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-2.5 shadow-lg">
          <span className="text-sm font-medium">판정 대기 {stagedCount}건</span>
          <span className="text-xs text-muted-foreground">저장 전까지 서버에 반영되지 않습니다</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setStaged({})}>모두 취소</Button>
            <Button size="sm" disabled={saving} onClick={handleBatchSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `일괄 저장 (${stagedCount}건)`}
            </Button>
          </div>
        </div>
      )}
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
    </div>
  );
}
