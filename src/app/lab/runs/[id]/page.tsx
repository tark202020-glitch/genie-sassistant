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

function ItemCard({ item, onVerdict }: { item: Item; onVerdict: (id: string, verdict: string, reason?: string) => Promise<void> }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const v = verdictOf(item);
  const p = item.payload;

  const title =
    item.item_type === 'line_edit'
      ? `${p.kind ?? '첨삭'} (${p.loc ?? '쪽 미상'})`
      : p.type_name || p.title || p.rule_id ? `${p.rule_id ?? ''} ${p.type_name ?? p.title ?? ''}`.trim() : p.question?.slice(0, 60) || item.item_type;

  const act = async (verdict: string, r?: string) => {
    setBusy(true);
    try {
      await onVerdict(item.id, verdict, r);
      setRejecting(false);
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={v ? 'opacity-90' : ''}>
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
            ) : (
              <div className="flex gap-1">
                <Button size="sm" disabled={busy} onClick={() => act('adopted')}>채택</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(!rejecting)}>기각</Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => act('disputed')}>이견</Button>
              </div>
            )}
          </div>
        </div>
        {v?.reason && <p className="text-xs text-muted-foreground">기각 사유: {v.reason}</p>}
        {rejecting && !v && (
          <div className="flex gap-2">
            <Textarea rows={1} placeholder="기각 이유 (필수)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" disabled={busy || !reason.trim()} onClick={() => act('rejected', reason)}>
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

  const handleVerdict = async (itemId: string, verdict: string, reason?: string) => {
    const res = await fetch(`/api/lab/items/${itemId}/verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict, reason }),
    });
    if (res.ok) await load();
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
                      {stepItems.map((it) => <ItemCard key={it.id} item={it} onVerdict={handleVerdict} />)}
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
    </div>
  );
}
