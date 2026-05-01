'use client';

import { useState, useMemo } from 'react';
import { ResponsiveChord } from '@nivo/chord';
import { Bot } from 'lucide-react';

interface ChordData {
  keys: string[];
  matrix: number[][];
  roles: string[];
  colors: string[];
}

interface CharacterChordDiagramProps {
  chord: ChordData;
  insights: string[];
}

// Jieun Theme — Steel Blue & Cream on Charcoal
const JIEUN_COLORS = [
  '#6B8FA3', // steel blue
  '#D4A574', // warm cream
  '#8B6F8E', // muted purple
  '#7BA085', // sage green
  '#C47B6B', // terracotta
  '#5E8BAD', // ocean blue
  '#A89B6B', // olive gold
  '#9B7B8E', // dusty rose
  '#6B9B8A', // teal
  '#B58D6B', // caramel
  '#7E8BAD', // periwinkle
  '#A08B6B', // sand
  '#8B7B6B', // warm gray
  '#6B8B8B', // slate teal
  '#AD8B7E', // blush
];

export function CharacterChordDiagram({ chord, insights }: CharacterChordDiagramProps) {
  const [activeArc, setActiveArc] = useState<string | null>(null);

  // 활성 캐릭터의 관계 요약
  const activeInfo = useMemo(() => {
    if (!activeArc) return null;
    const idx = chord.keys.indexOf(activeArc);
    if (idx < 0) return null;

    const connections = chord.matrix[idx]
      .map((val, j) => ({ name: chord.keys[j], value: val }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalWeight = connections.reduce((s, c) => s + c.value, 0);

    return {
      name: activeArc,
      role: chord.roles[idx],
      connections,
      totalWeight,
    };
  }, [activeArc, chord]);

  // 빈 매트릭스 체크
  const hasData = chord.matrix.some(row => row.some(v => v > 0));

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-white/40">
        <p>관계 데이터가 부족합니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Chord 다이어그램 */}
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <ResponsiveChord
            data={chord.matrix}
            keys={chord.keys}
            margin={{ top: 60, right: 60, bottom: 60, left: 60 }}
            padAngle={0.04}
            innerRadiusRatio={0.92}
            innerRadiusOffset={0.02}
            arcOpacity={1}
            arcBorderWidth={1}
            arcBorderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
            ribbonOpacity={0.5}
            ribbonBorderWidth={1}
            ribbonBorderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
            enableLabel={true}
            label="id"
            labelOffset={12}
            labelRotation={-90}
            labelTextColor="#e2e8f0"
            colors={JIEUN_COLORS.slice(0, chord.keys.length)}
            motionConfig="gentle"
            activeArcOpacity={1}
            inactiveArcOpacity={0.15}
            activeRibbonOpacity={0.85}
            inactiveRibbonOpacity={0.1}
            onArcMouseEnter={(arc) => setActiveArc(arc.id as string)}
            onArcMouseLeave={() => setActiveArc(null)}
            theme={{
              text: { fill: '#94a3b8', fontSize: 13, fontFamily: 'Pretendard, sans-serif' },
              tooltip: {
                container: {
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  padding: '10px 14px',
                  fontFamily: 'Pretendard, sans-serif',
                },
              },
            }}
          />
        </div>

        {/* 중앙 라벨 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          {activeInfo ? (
            <div className="space-y-1">
              <p className="text-white font-bold text-lg">{activeInfo.name}</p>
              <p className="text-white/50 text-xs">{activeInfo.role}</p>
              <p className="text-white/30 text-[11px]">관계량 {activeInfo.totalWeight}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-white/20 text-xs">캐릭터를 호버하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 사이드 패널 */}
      <div className="w-72 border-l border-white/5 flex flex-col overflow-hidden">
        {/* 관계 상세 (호버 시) */}
        {activeInfo && (
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: JIEUN_COLORS[chord.keys.indexOf(activeInfo.name)] }} />
              <span className="text-white font-medium text-sm">{activeInfo.name}</span>
              <span className="text-white/40 text-xs ml-auto">{activeInfo.role}</span>
            </div>
            <div className="space-y-1.5">
              {activeInfo.connections.map(c => {
                const pct = activeInfo.totalWeight > 0 ? (c.value / activeInfo.totalWeight * 100) : 0;
                return (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="text-white/70 w-16 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: JIEUN_COLORS[chord.keys.indexOf(c.name)] || '#6B8FA3',
                        }}
                      />
                    </div>
                    <span className="text-white/40 w-6 text-right">{c.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Insight Panel */}
        {insights.length > 0 && (
          <div className="flex-1 p-4 overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-[#6B8FA3]" />
              <span className="text-white/60 text-xs font-medium uppercase tracking-wider">AI Insight</span>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/60 leading-relaxed"
                >
                  <span className="text-[#6B8FA3] mr-1.5">{'>'}</span>
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 범례 */}
        <div className="p-4 border-t border-white/5">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Characters</p>
          <div className="space-y-1 max-h-32 overflow-auto">
            {chord.keys.map((name, i) => (
              <div
                key={name}
                className={`flex items-center gap-2 text-xs py-0.5 px-1.5 rounded cursor-default transition-colors ${
                  activeArc === name ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                onMouseEnter={() => setActiveArc(name)}
                onMouseLeave={() => setActiveArc(null)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: JIEUN_COLORS[i] || '#6B8FA3' }}
                />
                <span className="text-white/60 truncate">{name}</span>
                <span className="text-white/25 text-[10px] ml-auto">{chord.roles[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
