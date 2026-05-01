'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingCanvas } from './SettingCanvas';
import type { SettingGraphData } from '@/types/script-organizer';

interface SettingDiagramTabProps {
  assistantId: string;
}

export function SettingDiagramTab({ assistantId }: SettingDiagramTabProps) {
  const [graphData, setGraphData] = useState<SettingGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/script-analyses?assistantId=${assistantId}&type=settings`);
      const data = await res.json();
      if (data.analyses && data.analyses.length > 0) {
        setGraphData(data.analyses[0].data as SettingGraphData);
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
        body: JSON.stringify({ assistantId, analysisType: 'settings' }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `서버 오류 (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setGraphData(data.data);
      } else {
        setError(data.error || '분석 실패');
      }
    } catch (err: any) {
      setError(err.message || '배경 분석 중 오류가 발생했습니다.');
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-white/60">
          {analyzing ? '배경/공간 분석 중... (1~2분 소요)' : '저장된 데이터 불러오는 중...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <Button variant="outline" onClick={analyze} className="bg-white/5 border-white/10 text-white/80">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
        <MapPin className="w-12 h-12" />
        <p>분석할 배경 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>장소 <b className="text-indigo-400">{graphData.stats.totalLocations}</b></span>
          <span>관계 <b className="text-blue-400">{graphData.stats.totalRelationships}</b></span>
          <span>분석 대본 <b className="text-amber-400">{graphData.stats.analyzedScripts}</b></span>
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
      <div className="flex-1">
        <SettingCanvas nodes={graphData.nodes} edges={graphData.edges} />
      </div>
    </div>
  );
}
