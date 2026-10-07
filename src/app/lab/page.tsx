'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { estimateCost } from '@/lib/lab/pricing';

interface RunRow {
  id: string;
  mode: string;
  status: string;
  versions: Record<string, string>;
  metrics: { tokens?: { prompt: number; output: number; total: number } } | null;
  created_at: string;
  lab_manuscripts: { title: string; part_label: string | null } | null;
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
                  <th>모드</th>
                  <th>상태</th>
                  <th>모델</th>
                  <th>토큰 (대략 비용)</th>
                  <th>프롬프트 버전</th>
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
                    <td className="text-xs text-muted-foreground">{r.versions?.prompts}</td>
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
