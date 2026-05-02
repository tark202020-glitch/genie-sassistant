'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CharNode {
  id: string;
  label: string;
  role: string;
  age?: string;
  occupation?: string;
  goal?: string;
  personality?: string;
  description: string;
  episodes: number[];
  relationshipsSummary?: string;
  color: string;
  size: number;
}

interface CharEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  weight: number;
  color: string;
}

interface CharGraphData {
  assistant: { name: string; specialty: string };
  scripts: { episode: string; fileName: string; length: number }[];
  nodes: CharNode[];
  edges: CharEdge[];
  insights?: string[];
  stats: { totalCharacters: number; totalRelationships: number; analyzedScripts: number };
}

interface CharacterTabProps {
  assistantId: string;
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  '주인공': { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  '조연': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  '적대자': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  '조력자': { bg: 'bg-green-500/20', text: 'text-green-400' },
  '기타': { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

export function CharacterTab({ assistantId }: CharacterTabProps) {
  const [graphData, setGraphData] = useState<CharGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // 캐시에서 로드
  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/script-analyses?assistantId=${assistantId}&type=characters`);
      const data = await res.json();
      if (data.analyses && data.analyses.length > 0) {
        setGraphData(data.analyses[0].data as CharGraphData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [assistantId]);

  // AI 분석 실행 + 자동 저장
  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch(`/api/character-graph?assistantId=${assistantId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `서버 오류 (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGraphData(data);

      // 자동 저장
      try {
        await fetch('/api/script-analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId,
            analysisType: 'characters',
            name: '자동 저장',
            data,
          }),
        });
      } catch (saveErr) {
        console.error('캐릭터 분석 자동 저장 실패:', saveErr);
      }
    } catch (err: any) {
      setError(err.message || '캐릭터 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  }, [assistantId]);

  // 최초 로드 — 캐시만 확인 (자동 분석 안 함)
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCached();
      setLoading(false);
    })();
  }, [loadCached]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
        <p className="text-white/60">저장된 데이터 불러오는 중...</p>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
        <p className="text-white/60">캐릭터 분석 중... (1~2분 소요)</p>
        <p className="text-white/30 text-xs">완료 후 자동 저장됩니다</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
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
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Users className="w-12 h-12 text-white/30" />
        <p className="text-white/50">캐릭터 분석 데이터가 없습니다.</p>
        <p className="text-white/30 text-xs">아래 버튼을 눌러 AI 분석을 시작하세요. (1~2분 소요)</p>
        <Button
          onClick={analyze}
          disabled={analyzing}
          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${analyzing ? 'animate-spin' : ''}`} />
          캐릭터 분석 시작
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/60">
          <span>캐릭터 <b className="text-rose-400">{graphData.stats.totalCharacters}</b></span>
          <span>관계 <b className="text-pink-400">{graphData.stats.totalRelationships}</b></span>
          <span>대본 <b className="text-amber-400">{graphData.stats.analyzedScripts}</b></span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={analyze}
            disabled={analyzing}
            className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyzing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">다시 분석</span>
          </Button>
        </div>
      </div>

      {/* 캐릭터 프로필 카드 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6">
          {graphData.nodes.map((node) => {
            const badge = ROLE_BADGE[node.role] || ROLE_BADGE['기타'];
            const fields: { label: string; value?: string }[] = [
              { label: '나이', value: node.age },
              { label: '직업', value: node.occupation },
              { label: '목적', value: node.goal },
              { label: '성격', value: node.personality },
              { label: '소개', value: node.description },
              { label: '관계', value: node.relationshipsSummary },
            ];

            return (
              <div
                key={node.id}
                className="bg-[#12122a]/80 border border-white/10 rounded-xl p-4"
              >
                {/* Header */}
                <div className="flex items-start gap-2 flex-wrap mb-3">
                  <span className="text-white font-bold text-lg">{node.label}</span>
                  <span className={`${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full`}>
                    {node.role}
                  </span>
                </div>

                {/* Episode badges */}
                {node.episodes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {node.episodes.map((ep) => (
                      <span
                        key={ep}
                        className="bg-white/5 text-white/50 text-[10px] px-1.5 py-0.5 rounded"
                      >
                        {ep}화
                      </span>
                    ))}
                  </div>
                )}

                {/* Body rows */}
                <div className="space-y-1.5">
                  {fields.map(({ label, value }) => {
                    if (!value || value === '불명') return null;
                    return (
                      <div key={label} className="flex gap-2">
                        <span className="text-white/40 text-xs shrink-0 pt-0.5">{label}</span>
                        <span className="text-white/80 text-sm">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
