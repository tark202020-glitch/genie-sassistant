'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, FileText, Save, CheckCircle2 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [error, setError] = useState('');

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/script-analyses?assistantId=${assistantId}&type=episodes`);
      const data = await res.json();
      if (data.analyses && data.analyses.length > 0) {
        setSummaries(data.analyses[0].data as EpisodeSummary[]);
        setSaved(true);
        setUnsaved(false);
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
        setSaved(false);
        setUnsaved(true);
      } else {
        setError(data.error || '분석 실패');
      }
    } catch (err: any) {
      setError(err.message || '화별 요약 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  }, [assistantId]);

  // 수동 저장
  const saveToDb = useCallback(async () => {
    if (summaries.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/script-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          analysisType: 'episodes',
          name: '자동 저장',
          data: summaries,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '저장 실패');
      setSaved(true);
      setUnsaved(false);
    } catch (err: any) {
      setError(`저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [assistantId, summaries]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCached();
      setLoading(false);
    })();
  }, [loadCached]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-muted-foreground">저장된 데이터 불러오는 중...</p>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-muted-foreground">화별 요약 분석 중... (대본 수에 따라 1~3분 소요)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400">{error}</p>
        <Button variant="outline" onClick={() => { setError(''); analyze(); }} className="bg-secondary/50 border-border text-foreground/80">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FileText className="w-12 h-12 text-muted-foreground/50" />
        <p className="text-muted-foreground/70">화별 요약 데이터가 없습니다.</p>
        <p className="text-muted-foreground/50 text-xs">아래 버튼을 눌러 AI 분석을 시작하세요. (대본 수에 따라 1~3분 소요)</p>
        <Button
          onClick={analyze}
          disabled={analyzing}
          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${analyzing ? 'animate-spin' : ''}`} />
          화별 요약 분석 시작
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground/90">화별 요약</h2>
          <span className="text-xs text-muted-foreground/60 bg-secondary/50 px-2.5 py-1 rounded-full">
            {summaries.length}화
          </span>
          {saved && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> 저장됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unsaved && (
            <Button
              size="sm"
              onClick={saveToDb}
              disabled={saving}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              저장하기
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={analyze}
            disabled={analyzing}
            className="bg-secondary/50 border-border text-foreground/70 hover:bg-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyzing ? 'animate-spin' : ''}`} />
            다시 분석
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summaries.map((summary) => (
          <EpisodeCard key={summary.episode} summary={summary} />
        ))}
      </div>
    </div>
  );
}
