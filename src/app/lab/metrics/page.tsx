'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RunRow {
  id: string;
  mode: string;
  status: string;
  versions: Record<string, string>;
  created_at: string;
  lab_manuscripts: { title: string; part_label: string | null } | null;
}

interface MetricsResp {
  run: { id: string; model?: string; prompts?: string; manuscript?: string; tokens?: { total: number } | null };
  metrics: { key: string; label: string; value: number | null; target: string; status: string; note: string }[];
  requiredCase: { passed: boolean; applicable: boolean; label: string; detail: string };
  issueSummary: { rule_id: string; grade: string; loc: string; title: string }[];
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const statusBadge = (s: string) =>
  s === 'pass' ? <Badge>달성</Badge> : s === 'fail' ? <Badge variant="destructive">미달</Badge> : <Badge variant="secondary">계산 불가</Badge>;

function runLabel(r: RunRow) {
  const d = new Date(r.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const model = (r.versions?.model ?? 'flash').replace('gemini-2.5-', '');
  return `${d} · ${r.lab_manuscripts?.title ?? ''} · ${model}`;
}

/** 결함 비교 키: 규칙 + 첫 쪽 번호 */
const issueKey = (i: { rule_id: string; loc: string }) => `${i.rule_id}|${(String(i.loc).match(/\d+/) ?? ['?'])[0]}`;

export default function MetricsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [a, setA] = useState<MetricsResp | null>(null);
  const [b, setB] = useState<MetricsResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/lab/runs')
      .then((r) => r.json())
      .then((d) => {
        const done = (d.runs ?? []).filter((r: RunRow) => r.status === 'done');
        setRuns(done);
        if (done[0]) setAId(done[0].id);
      });
  }, []);

  const loadMetrics = useCallback(async (id: string): Promise<MetricsResp | null> => {
    if (!id) return null;
    const res = await fetch(`/api/lab/runs/${id}/metrics`);
    return res.ok ? res.json() : null;
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMetrics(aId), loadMetrics(bId)])
      .then(([ra, rb]) => {
        setA(ra);
        setB(rb);
      })
      .finally(() => setLoading(false));
  }, [aId, bId, loadMetrics]);

  const bOnly = a && b ? b.issueSummary.filter((i) => !a.issueSummary.some((j) => issueKey(j) === issueKey(i))) : [];
  const aOnly = a && b ? a.issueSummary.filter((i) => !b.issueSummary.some((j) => issueKey(j) === issueKey(i))) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">지표 대시보드</h1>

      <div className="flex gap-3 flex-wrap text-sm items-center">
        <span className="text-muted-foreground">실행 A</span>
        <select className="border rounded-md px-2 py-1.5 bg-background max-w-[340px]" value={aId} onChange={(e) => setAId(e.target.value)}>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>{runLabel(r)}</option>
          ))}
        </select>
        <span className="text-muted-foreground">비교 B (선택)</span>
        <select className="border rounded-md px-2 py-1.5 bg-background max-w-[340px]" value={bId} onChange={(e) => setBId(e.target.value)}>
          <option value="">— 비교 안 함 —</option>
          {runs.filter((r) => r.id !== aId).map((r) => (
            <option key={r.id} value={r.id}>{runLabel(r)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">계산 중…</p>
      ) : !a ? (
        <p className="text-sm text-muted-foreground">완료된 실행이 없습니다.</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">지표 6종 (설계문서 §11-2)</CardTitle>
              <Badge
                variant={!a.requiredCase.applicable ? 'secondary' : a.requiredCase.passed ? 'default' : 'destructive'}
                title={a.requiredCase.detail}
              >
                {!a.requiredCase.applicable ? '해당 없음' : a.requiredCase.passed ? '✓' : '✗'} 필수 케이스(편의점 R25 A급)
              </Badge>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2">지표</th>
                    <th>A{a.run.model ? ` (${a.run.model.replace('gemini-2.5-', '')})` : ''}</th>
                    {b && <th>B{b.run.model ? ` (${b.run.model.replace('gemini-2.5-', '')})` : ''}</th>}
                    <th>목표</th>
                    <th>판정(A)</th>
                  </tr>
                </thead>
                <tbody>
                  {a.metrics.map((m) => {
                    const mb = b?.metrics.find((x) => x.key === m.key);
                    return (
                      <tr key={m.key} className="border-b last:border-0">
                        <td className="py-2">{m.label}</td>
                        <td title={m.note}>{pct(m.value)} <span className="text-xs text-muted-foreground">({m.note})</span></td>
                        {b && <td title={mb?.note}>{pct(mb?.value ?? null)}</td>}
                        <td>{m.target}</td>
                        <td>{statusBadge(m.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                "계산 불가"는 골드 데이터(편집자 판정·임포트)가 아직 없다는 뜻입니다. 실행 상세에서 채택/기각 판정을 남기면 그 항목부터 계산됩니다.
              </p>
            </CardContent>
          </Card>

          {b && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">회귀 비교 — A·B급 결함 차이 (규칙+쪽 기준)</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">B에서 새로 잡은 것 ({bOnly.length})</p>
                  {bOnly.length === 0 ? <p className="text-muted-foreground text-xs">없음</p> : bOnly.map((i, k) => (
                    <p key={k} className="text-xs border-l-2 pl-2 mb-1">[{i.grade}] {i.rule_id} ({i.loc}) {i.title}</p>
                  ))}
                </div>
                <div>
                  <p className="font-medium mb-1">B에서 놓친 것 — A에는 있음 ({aOnly.length})</p>
                  {aOnly.length === 0 ? <p className="text-muted-foreground text-xs">없음</p> : aOnly.map((i, k) => (
                    <p key={k} className="text-xs border-l-2 pl-2 mb-1">[{i.grade}] {i.rule_id} ({i.loc}) {i.title}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            실행 상세로 이동: <Link className="underline" href={`/lab/runs/${a.run.id}`}>A 열기</Link>
            {b && <> · <Link className="underline" href={`/lab/runs/${b.run.id}`}>B 열기</Link></>}
          </p>
        </>
      )}
    </div>
  );
}
