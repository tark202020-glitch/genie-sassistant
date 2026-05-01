'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EpisodeCard } from './EpisodeCard';
import type { EpisodeSummary } from '@/types/script-organizer';

interface EpisodeSummaryTabProps {
  assistantId: string;
}

export function EpisodeSummaryTab({ assistantId }: EpisodeSummaryTabProps) {
  const [summaries, setSummaries] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/script-analyses?assistantId=${assistantId}&type=episodes`);
      const data = await res.json();
      if (data.analyses && data.analyses.length > 0) {
        setSummaries(data.analyses[0].data as EpisodeSummary[]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [assistantId]);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/script-organizer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, analysisType: 'episodes' }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `서버 오류 (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setSummaries(data.data);
      } else {
        setError(data.error || '분석 실패');
      }
    } catch (err: any) {
      setError(err.message || '화별 요약 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  }, [assistantId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hasCached = await loadCached();
      if (!hasCached) {
        await analyze();
      }
      setLoading(false);
    })();
  }, [loadCached, analyze]);

  if (loading || analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-white/60">
          {analyzing ? '화별 요약 분석 중... (대본 수에 따라 1~3분 소요)' : '저장된 데이터 불러오는 중...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400">{error}</p>
        <Button variant="outline" onClick={analyze} className="bg-white/5 border-white/10 text-white/80">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
        <FileText className="w-12 h-12" />
        <p>분석할 대본이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white/90">화별 요약</h2>
          <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
            {summaries.length}화
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={analyze}
          disabled={analyzing}
          className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyzing ? 'animate-spin' : ''}`} />
          다시 분석
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summaries.map((summary) => (
          <EpisodeCard key={summary.episode} summary={summary} />
        ))}
      </div>
    </div>
  );
}
