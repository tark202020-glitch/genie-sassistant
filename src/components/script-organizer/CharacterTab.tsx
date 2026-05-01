'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, Users, ExternalLink, Network, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterChordDiagram } from './CharacterChordDiagram';

interface CharNode {
  id: string;
  label: string;
  role: string;
  description: string;
  episodes: number[];
  color: string;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CharEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  weight: number;
  color: string;
}

interface ChordData {
  keys: string[];
  matrix: number[][];
  roles: string[];
  colors: string[];
}

interface CharGraphData {
  assistant: { name: string; specialty: string };
  scripts: { episode: string; fileName: string; length: number }[];
  nodes: CharNode[];
  edges: CharEdge[];
  chord?: ChordData;
  insights?: string[];
  stats: { totalCharacters: number; totalRelationships: number; analyzedScripts: number };
}

type ViewMode = 'canvas' | 'chord';

interface CharacterTabProps {
  assistantId: string;
}

export function CharacterTab({ assistantId }: CharacterTabProps) {
  const [graphData, setGraphData] = useState<CharGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredNode, setHoveredNode] = useState<CharNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<CharNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<CharNode[]>([]);
  const edgesRef = useRef<CharEdge[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isPanning: false, startX: 0, startY: 0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });

  // 데이터 로드
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/character-graph?assistantId=${assistantId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGraphData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [assistantId]);

  // Canvas 시뮬레이션
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const nodes = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });

    nodesRef.current = nodes;
    edgesRef.current = graphData.edges;
    transformRef.current = { x: 0, y: 0, scale: 1 };

    let alpha = 1;

    function tick() {
      const canvas2 = canvasRef.current;
      if (!canvas2) return;
      const ctx = canvas2.getContext('2d');
      if (!ctx) return;

      const w = canvas2.width / 2;
      const h = canvas2.height / 2;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const t = transformRef.current;

      alpha *= 0.995;
      if (alpha < 0.001) alpha = 0;

      // 중심 인력
      for (const node of nodes) {
        if (node.fx !== null && node.fx !== undefined) continue;
        node.vx! += (w / 2 - node.x!) * 0.0008 * (alpha > 0 ? 1 : 0);
        node.vy! += (h / 2 - node.y!) * 0.0008 * (alpha > 0 ? 1 : 0);
      }

      // 노드 반발
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x! - nodes[i].x!;
          const dy = nodes[j].y! - nodes[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (180 * 180) / (dist * dist) * (alpha > 0 ? 1 : 0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (nodes[i].fx === null || nodes[i].fx === undefined) { nodes[i].vx! -= fx; nodes[i].vy! -= fy; }
          if (nodes[j].fx === null || nodes[j].fx === undefined) { nodes[j].vx! += fx; nodes[j].vy! += fy; }
        }
      }

      // 엣지 스프링
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 160 - edge.weight * 15;
        const force = (dist - targetDist) * 0.005 * (alpha > 0 ? 1 : 0);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (source.fx === null || source.fx === undefined) { source.vx! += fx; source.vy! += fy; }
        if (target.fx === null || target.fx === undefined) { target.vx! -= fx; target.vy! -= fy; }
      }

      // 속도 적용
      for (const node of nodes) {
        if (node.fx !== null && node.fx !== undefined) {
          node.x = node.fx; node.y = node.fy!; node.vx = 0; node.vy = 0;
        } else {
          node.vx! *= 0.85; node.vy! *= 0.85;
          node.x! += node.vx!; node.y! += node.vy!;
        }
      }

      // 렌더링
      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      // 그리드
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = (t.x % 50); x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = (t.y % 50); y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // 엣지
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) continue;

        ctx.beginPath();
        ctx.moveTo(source.x!, source.y!);
        ctx.lineTo(target.x!, target.y!);
        ctx.strokeStyle = edge.color + 'aa';
        ctx.lineWidth = 1 + edge.weight * 0.8;
        ctx.stroke();

        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        ctx.font = 'bold 14px "Pretendard", sans-serif';
        const lw = ctx.measureText(edge.type).width + 14;
        ctx.fillStyle = '#0a0a1aee';
        ctx.fillRect(midX - lw / 2, midY - 11, lw, 22);
        ctx.fillStyle = edge.color + 'ee';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.type, midX, midY);
      }

      // 노드
      for (const node of nodes) {
        const r = node.size;
        const color = node.color;

        // 글로우
        const glow = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        glow.addColorStop(0, `${color}30`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(node.x! - r * 3, node.y! - r * 3, r * 6, r * 6);

        // 원
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(node.x! - r * 0.3, node.y! - r * 0.3, 0, node.x!, node.y!, r);
        grad.addColorStop(0, `${color}ee`);
        grad.addColorStop(1, `${color}88`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `${color}cc`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 역할 아이콘
        const roleIcon: Record<string, string> = { '주인공': '⭐', '조연': '👤', '적대자': '🔥', '조력자': '🤝', '기타': '👥' };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roleIcon[node.role] || '👤', node.x!, node.y!);

        // 이름
        ctx.font = 'bold 18px "Pretendard", sans-serif';
        const nw = ctx.measureText(node.label).width + 16;
        ctx.fillStyle = '#0a0a1acc';
        ctx.fillRect(node.x! - nw / 2, node.y! + r + 4, nw, 24);
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + r + 20);

        // 역할
        ctx.font = '13px "Pretendard", sans-serif';
        ctx.fillStyle = `${color}cc`;
        ctx.fillText(node.role, node.x!, node.y! + r + 38);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData]);

  const getPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const t = transformRef.current;
    return { x: (e.clientX - rect.left - t.x) / t.scale, y: (e.clientY - rect.top - t.y) / t.scale };
  }, []);

  const findNode = useCallback((x: number, y: number) => {
    for (const n of [...nodesRef.current].reverse()) {
      const dx = n.x! - x, dy = n.y! - y;
      if (dx * dx + dy * dy <= n.size * n.size * 2) return n;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    const node = findNode(pos.x, pos.y);
    mouseRef.current.isDown = true;
    mouseRef.current.startX = e.clientX;
    mouseRef.current.startY = e.clientY;
    if (node) { setDraggedNode(node); node.fx = node.x; node.fy = node.y; }
    else mouseRef.current.isPanning = true;
  }, [getPos, findNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    setHoveredNode(findNode(pos.x, pos.y));
    if (canvasRef.current) canvasRef.current.style.cursor = findNode(pos.x, pos.y) ? 'grab' : 'default';
    if (draggedNode && mouseRef.current.isDown) {
      draggedNode.fx = pos.x; draggedNode.fy = pos.y;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
    if (mouseRef.current.isPanning && mouseRef.current.isDown) {
      const dx = e.clientX - mouseRef.current.startX, dy = e.clientY - mouseRef.current.startY;
      mouseRef.current.startX = e.clientX; mouseRef.current.startY = e.clientY;
      transformRef.current = { ...transformRef.current, x: transformRef.current.x + dx, y: transformRef.current.y + dy };
    }
  }, [getPos, findNode, draggedNode]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode) { draggedNode.fx = null; draggedNode.fy = null; setDraggedNode(null); }
    mouseRef.current.isDown = false; mouseRef.current.isPanning = false;
  }, [draggedNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, transformRef.current.scale * delta));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    transformRef.current = {
      x: mx - (mx - transformRef.current.x) * (newScale / transformRef.current.scale),
      y: my - (my - transformRef.current.y) * (newScale / transformRef.current.scale),
      scale: newScale,
    };
  }, []);

  const handleReload = () => {
    setLoading(true);
    setError('');
    setGraphData(null);
    fetch(`/api/character-graph?assistantId=${assistantId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGraphData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
        <p className="text-white/60">캐릭터 관계도 생성 중... (1~2분 소요)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <Button variant="outline" onClick={handleReload} className="bg-white/5 border-white/10 text-white/80">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
        <Users className="w-12 h-12" />
        <p>분석할 대본 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>캐릭터 <b className="text-rose-400">{graphData.stats.totalCharacters}</b></span>
          <span>관계 <b className="text-pink-400">{graphData.stats.totalRelationships}</b></span>
          <span>분석 대본 <b className="text-amber-400">{graphData.stats.analyzedScripts}</b></span>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'canvas'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
              title="노드 그래프"
            >
              <Network className="w-3.5 h-3.5" />
              그래프
            </button>
            <button
              onClick={() => setViewMode('chord')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'chord'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
              title="코드 다이어그램"
            >
              <Circle className="w-3.5 h-3.5" />
              코드
            </button>
          </div>
          <a
            href={`/character-graph?assistantId=${assistantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            전체 화면
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            다시 분석
          </Button>
        </div>
      </div>

      {/* Chord 뷰 */}
      {viewMode === 'chord' && graphData.chord && (
        <div className="flex-1">
          <CharacterChordDiagram
            chord={graphData.chord}
            insights={graphData.insights || []}
          />
        </div>
      )}

      {/* Canvas 뷰 */}
      <div className={`flex-1 relative ${viewMode === 'chord' ? 'hidden' : ''}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* 범례 */}
        <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 w-40 space-y-3">
          <p className="text-white/60 text-xs font-medium">역할</p>
          <div className="space-y-1.5 text-xs">
            {[
              { role: '주인공', icon: '⭐', color: '#ef4444' },
              { role: '조연', icon: '👤', color: '#3b82f6' },
              { role: '적대자', icon: '🔥', color: '#f97316' },
              { role: '조력자', icon: '🤝', color: '#22c55e' },
              { role: '기타', icon: '👥', color: '#94a3b8' },
            ].map(({ role, icon, color }) => (
              <div key={role} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full inline-block border" style={{ background: `${color}66`, borderColor: `${color}88` }} />
                <span className="text-white/60">{icon} {role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 호버 정보 */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-[#12122a]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 max-w-xs">
            <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
            <p className="text-white/60 text-xs mt-1">{hoveredNode.role}</p>
            <p className="text-white/40 text-xs mt-1">{hoveredNode.description}</p>
            {hoveredNode.episodes.length > 0 && (
              <p className="text-white/30 text-xs mt-1">등장: {hoveredNode.episodes.map(e => `${e}화`).join(', ')}</p>
            )}
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-white/30 text-xs space-y-0.5 text-right">
          <p>드래그 — 노드 이동</p>
          <p>빈 공간 드래그 — 캔버스 이동</p>
          <p>마우스 휠 — 줌 인/아웃</p>
        </div>
      </div>
    </div>
  );
}
