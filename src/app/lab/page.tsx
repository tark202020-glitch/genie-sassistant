'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { estimateCost } from '@/lib/lab/pricing';
import { TEXT_TYPE_COLOR, TEXT_TYPE_LABEL, fitPercents, type TextTypeInfo } from '@/lib/lab/text-type';

interface RunRow {
  id: string;
  mode: string;
  status: string;
  versions: Record<string, string>;
  metrics: { tokens?: { prompt: number; output: number; total: number } } | null;
  created_at: string;
  lab_manuscripts: { title: string; part_label: string | null } | null;
  /** 단계 1의 text_type만 (API가 step=1로 걸러 줌) */
  lab_run_steps?: { step: string; text_type: TextTypeInfo | null }[];
}

/** 글 종류 칸 — 적용 종류 + 결정 방식(자동이면 적합 비중) */
function TextTypeCell({ run }: { run: RunRow }) {
  const tt = run.lab_run_steps?.[0]?.text_type;
  const choice = run.versions?.text_type_choice;
  // 단계 1 전이면 작가 지정값만 보인다
  const type = tt?.type ?? (choice === 'fiction' || choice === 'essay' ? choice : null);
  if (!type) return <span className="text-muted-foreground">—</span>;
  const author = tt ? tt.decided_by === 'author' : true;
  const pct = fitPercents(tt);
  return (
    <>
      <span className="font-semibold" style={{ color: TEXT_TYPE_COLOR[type] }}>{TEXT_TYPE_LABEL[type] ?? type}</span>
      <span className="block text-[11px] text-muted-foreground">
        {author
          ? `지정${tt?.detected && tt.detected !== type ? ` · 자동은 ${TEXT_TYPE_LABEL[tt.detected] ?? tt.detected}` : ''}${!tt ? ' · 분석 전' : ''}`
          : `자동${pct ? ` ${pct[type as 'fiction' | 'essay']}%` : ''}`}
      </span>
    </>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  running: '실행 중',
  done: '완료',
  failed: '실패',
};

export default function LabHome() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lab/runs')
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">실행 목록</h1>
        <Button asChild>
          <Link href="/lab/new">새 실행</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            피드백 에이전트 테스트 실행 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 실행이 없습니다. [새 실행]에서 원고를 올리고 첫 테스트를 시작하세요.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">일시</th>
                  <th>원고</th>
                  <th>글 종류</th>
                  <th>모드</th>
                  <th>상태</th>
                  <th>모델</th>
                  <th>토큰 (대략 비용)</th>
                  <th>에이전트</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                    <td>
                      {r.lab_manuscripts?.title}
                      {r.lab_manuscripts?.part_label ? ` (${r.lab_manuscripts.part_label})` : ''}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      <TextTypeCell run={r} />
                    </td>
                    <td>{r.mode}</td>
                    <td>
                      <Badge variant={r.status === 'done' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {(r.versions?.model ?? 'gemini-2.5-flash').replace('gemini-2.5-', '')}
                    </td>
                    <td
                      className="text-xs text-muted-foreground whitespace-nowrap"
                      title={
                        r.metrics?.tokens
                          ? estimateCost(r.versions?.model, r.metrics.tokens)?.formula
                          : '기록 없음 (토큰 집계 도입 전 실행)'
                      }
                    >
                      {r.metrics?.tokens ? (
                        <>
                          {r.metrics.tokens.total.toLocaleString('ko-KR')}
                          {(() => {
                            const c = estimateCost(r.versions?.model, r.metrics.tokens);
                            return c ? (
                              <span className="block">
                                ≈ ${c.usd.toFixed(2)} (약 {c.krw.toLocaleString('ko-KR')}원)
                              </span>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground" title={r.versions?.prompts}>
                      {r.versions?.agent ?? '—'}
                    </td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/lab/runs/${r.id}`}>상세</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
