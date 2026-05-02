'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SettingGraphData, SettingNode, SettingEdge } from '@/types/script-organizer';

const TYPE_ORDER: Array<SettingNode['type']> = ['indoor', 'outdoor', 'vehicle', 'virtual', 'other'];

const TYPE_META: Record<string, { icon: string; label: string; headerClass: string }> = {
  indoor:  { icon: '🏠', label: '실내',     headerClass: 'text-indigo-400' },
  outdoor: { icon: '🌳', label: '실외',     headerClass: 'text-green-400' },
  vehicle: { icon: '🚗', label: '차량/이동', headerClass: 'text-orange-400' },
  virtual: { icon: '💻', label: '가상',     headerClass: 'text-purple-400' },
  other:   { icon: '📍', label: '기타',     headerClass: 'text-slate-400' },
};

const REL_LABELS: Record<string, string> = {
  contains:  '포함',
  adjacent:  '인접',
  connected: '연결',
  part_of:   '소속',
  opposite:  '대비',
};

function getRelLabel(rel: string): string {
  return REL_LABELS[rel] ?? rel;
}

function getRelArrow(rel: string): string {
  return rel === 'adjacent' || rel === 'connected' ? '↔' : '→';
}

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

  // Build a lookup: nodeId → related edges
  const relMap = useMemo(() => {
    if (!graphData) return new Map<string, { targetLabel: string; relationship: string }[]>();
    const map = new Map<string, { targetLabel: string; relationship: string }[]>();
    const labelById = new Map(graphData.nodes.map((n) => [n.id, n.label]));

    for (const edge of graphData.edges) {
      const srcLabel = labelById.get(edge.source) ?? edge.source;
      const tgtLabel = labelById.get(edge.target) ?? edge.target;

      if (!map.has(edge.source)) map.set(edge.source, []);
      map.get(edge.source)!.push({ targetLabel: tgtLabel, relationship: edge.relationship });

      if (!map.has(edge.target)) map.set(edge.target, []);
      map.get(edge.target)!.push({ targetLabel: srcLabel, relationship: edge.relationship });
    }
    return map;
  }, [graphData]);

  // Group nodes by type, sorted by frequency desc
  const groups = useMemo(() => {
    if (!graphData) return [];
    const byType = new Map<string, SettingNode[]>();
    for (const node of graphData.nodes) {
      if (!byType.has(node.type)) byType.set(node.type, []);
      byType.get(node.type)!.push(node);
    }
    // Sort each group by frequency descending
    for (const nodes of byType.values()) {
      nodes.sort((a, b) => b.frequency - a.frequency);
    }
    return TYPE_ORDER.filter((t) => byType.has(t)).map((t) => ({ type: t, nodes: byType.get(t)! }));
  }, [graphData]);

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
      {/* Stats bar */}
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

      {/* Scrollable location listing */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        {groups.map(({ type, nodes }) => {
          const meta = TYPE_META[type];
          return (
            <section key={type}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{meta.icon}</span>
                <h3 className={`font-semibold text-base ${meta.headerClass}`}>{meta.label}</h3>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-xs font-medium">
                  {nodes.length}
                </span>
              </div>

              {/* Location cards */}
              <div className="grid gap-3">
                {nodes.map((node) => {
                  const rels = relMap.get(node.id) ?? [];
                  return (
                    <div
                      key={node.id}
                      className="bg-[#12122a]/80 border border-white/10 rounded-xl p-4"
                    >
                      {/* Name + frequency */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-white font-medium text-base">{node.label}</span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                          등장 {node.frequency}회
                        </span>
                      </div>

                      {/* Description */}
                      {node.description && (
                        <p className="text-white/60 text-sm mb-2">{node.description}</p>
                      )}

                      {/* Episode pills */}
                      {node.episodes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {node.episodes.map((ep) => (
                            <span
                              key={ep}
                              className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-xs"
                            >
                              {ep}화
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Related locations */}
                      {rels.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                          {rels.map((r, i) => (
                            <p key={i} className="text-white/40 text-xs">
                              {getRelArrow(r.relationship)} {r.targetLabel}{' '}
                              <span className="text-white/30">({getRelLabel(r.relationship)})</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
