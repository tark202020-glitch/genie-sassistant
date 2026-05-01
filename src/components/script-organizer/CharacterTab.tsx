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

// iOS Safari 캔버스 최대 크기 제한 (면적 기준 약 16M 픽셀)
function getSafeCanvasScale(width: number, height: number): number {
  const MAX_PIXELS = 16_000_000;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
  const totalPixels = width * dpr * height * dpr;
  if (totalPixels > MAX_PIXELS) {
    return Math.sqrt(MAX_PIXELS / (width * height));
  }
  return dpr;
}

// 터치 이벤트 → 좌표 추출 헬퍼
function getTouchPos(touch: { clientX: number; clientY: number }, rect: DOMRect, t: { x: number; y: number; scale: number }) {
  return {
    x: (touch.clientX - rect.left - t.x) / t.scale,
    y: (touch.clientY - rect.top - t.y) / t.scale,
  };
}

export function CharacterTab({ assistantId }: CharacterTabProps) {
  const [graphData, setGraphData] = useState<CharGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [hoveredNode, setHoveredNode] = useState<CharNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<CharNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<CharNode[]>([]);
  const edgesRef = useRef<CharEdge[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isPanning: false, startX: 0, startY: 0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const draggedNodeRef = useRef<CharNode | null>(null);

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

  // 최초 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      const hasCached = await loadCached();
      if (!hasCached) await analyze();
      setLoading(false);
    })();
  }, [loadCached, analyze]);

  // 컨테이너 크기 감시 (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 노드 탐색 헬퍼
  const findNodeAt = useCallback((x: number, y: number) => {
    for (const n of [...nodesRef.current].reverse()) {
      const dx = n.x! - x, dy = n.y! - y;
      if (dx * dx + dy * dy <= n.size * n.size * 2) return n;
    }
    return null;
  }, []);

  // Canvas 시뮬레이션
  useEffect(() => {
    if (!graphData || !canvasRef.current || viewMode !== 'canvas') return;
    if (containerSize.w === 0 || containerSize.h === 0) return;

    const canvas = canvasRef.current;
    const width = containerSize.w;
    const height = containerSize.h;
    const scale = getSafeCanvasScale(width, height);

    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
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

      const w = width;
      const h = height;
      const currentNodes = nodesRef.current;
      const edges = edgesRef.current;
      const t = transformRef.current;

      alpha *= 0.995;
      if (alpha < 0.001) alpha = 0;

      for (const node of currentNodes) {
        if (node.fx !== null && node.fx !== undefined) continue;
        node.vx! += (w / 2 - node.x!) * 0.0008 * (alpha > 0 ? 1 : 0);
        node.vy! += (h / 2 - node.y!) * 0.0008 * (alpha > 0 ? 1 : 0);
      }

      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const dx = currentNodes[j].x! - currentNodes[i].x!;
          const dy = currentNodes[j].y! - currentNodes[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (180 * 180) / (dist * dist) * (alpha > 0 ? 1 : 0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (currentNodes[i].fx === null || currentNodes[i].fx === undefined) { currentNodes[i].vx! -= fx; currentNodes[i].vy! -= fy; }
          if (currentNodes[j].fx === null || currentNodes[j].fx === undefined) { currentNodes[j].vx! += fx; currentNodes[j].vy! += fy; }
        }
      }

      for (const edge of edges) {
        const source = currentNodes.find(n => n.id === edge.source);
        const target = currentNodes.find(n => n.id === edge.target);
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

      for (const node of currentNodes) {
        if (node.fx !== null && node.fx !== undefined) {
          node.x = node.fx; node.y = node.fy!; node.vx = 0; node.vy = 0;
        } else {
          node.vx! *= 0.85; node.vy! *= 0.85;
          node.x! += node.vx!; node.y! += node.vy!;
        }
      }

      ctx.save();
      ctx.scale(scale, scale);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(100, 100, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = (t.x % 50); x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = (t.y % 50); y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      for (const edge of edges) {
        const source = currentNodes.find(n => n.id === edge.source);
        const target = currentNodes.find(n => n.id === edge.target);
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

      for (const node of currentNodes) {
        const r = node.size;
        const color = node.color;

        const glow = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        glow.addColorStop(0, `${color}30`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(node.x! - r * 3, node.y! - r * 3, r * 6, r * 6);

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

        const roleIcon: Record<string, string> = { '주인공': '⭐', '조연': '👤', '적대자': '🔥', '조력자': '🤝', '기타': '👥' };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roleIcon[node.role] || '👤', node.x!, node.y!);

        ctx.font = 'bold 18px "Pretendard", sans-serif';
        const nw = ctx.measureText(node.label).width + 16;
        ctx.fillStyle = '#0a0a1acc';
        ctx.fillRect(node.x! - nw / 2, node.y! + r + 4, nw, 24);
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + r + 20);

        ctx.font = '13px "Pretendard", sans-serif';
        ctx.fillStyle = `${color}cc`;
        ctx.fillText(node.role, node.x!, node.y! + r + 38);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData, viewMode, containerSize]);

  // --- 마우스 이벤트 ---
  const getPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const t = transformRef.current;
    return { x: (e.clientX - rect.left - t.x) / t.scale, y: (e.clientY - rect.top - t.y) / t.scale };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    const node = findNodeAt(pos.x, pos.y);
    mouseRef.current.isDown = true;
    mouseRef.current.startX = e.clientX;
    mouseRef.current.startY = e.clientY;
    if (node) { setDraggedNode(node); draggedNodeRef.current = node; node.fx = node.x; node.fy = node.y; }
    else mouseRef.current.isPanning = true;
  }, [getPos, findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    setHoveredNode(findNodeAt(pos.x, pos.y));
    if (canvasRef.current) canvasRef.current.style.cursor = findNodeAt(pos.x, pos.y) ? 'grab' : 'default';
    const dn = draggedNodeRef.current;
    if (dn && mouseRef.current.isDown) {
      dn.fx = pos.x; dn.fy = pos.y;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
    if (mouseRef.current.isPanning && mouseRef.current.isDown) {
      const dx = e.clientX - mouseRef.current.startX, dy = e.clientY - mouseRef.current.startY;
      mouseRef.current.startX = e.clientX; mouseRef.current.startY = e.clientY;
      transformRef.current = { ...transformRef.current, x: transformRef.current.x + dx, y: transformRef.current.y + dy };
    }
  }, [getPos, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    const dn = draggedNodeRef.current;
    if (dn) { dn.fx = null; dn.fy = null; draggedNodeRef.current = null; setDraggedNode(null); }
    mouseRef.current.isDown = false; mouseRef.current.isPanning = false;
  }, []);

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

  // --- 터치 이벤트 (iPad/모바일) ---
  const lastTouchRef = useRef<{ x: number; y: number; dist?: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getTouchPos(touch, rect, t);
      const node = findNodeAt(pos.x, pos.y);

      mouseRef.current.isDown = true;
      mouseRef.current.startX = touch.clientX;
      mouseRef.current.startY = touch.clientY;

      if (node) {
        draggedNodeRef.current = node;
        setDraggedNode(node);
        node.fx = node.x;
        node.fy = node.y;
      } else {
        mouseRef.current.isPanning = true;
      }
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // 핀치 줌 시작
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
    }
  }, [findNodeAt]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;

    if (e.touches.length === 1 && lastTouchRef.current) {
      const touch = e.touches[0];
      const dn = draggedNodeRef.current;

      if (dn) {
        const pos = getTouchPos(touch, rect, t);
        dn.fx = pos.x;
        dn.fy = pos.y;
      } else if (mouseRef.current.isPanning) {
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;
        transformRef.current = { ...t, x: t.x + dx, y: t.y + dy };
      }
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastTouchRef.current?.dist) {
      // 핀치 줌
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const ratio = newDist / lastTouchRef.current.dist;
      const newScale = Math.max(0.2, Math.min(3, t.scale * ratio));

      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      transformRef.current = {
        x: cx - (cx - t.x) * (newScale / t.scale),
        y: cy - (cy - t.y) * (newScale / t.scale),
        scale: newScale,
      };
      lastTouchRef.current = { x: cx + rect.left, y: cy + rect.top, dist: newDist };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const dn = draggedNodeRef.current;
    if (dn) { dn.fx = null; dn.fy = null; draggedNodeRef.current = null; setDraggedNode(null); }
    mouseRef.current.isDown = false;
    mouseRef.current.isPanning = false;
    lastTouchRef.current = null;
  }, []);

  if (loading || analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
        <p className="text-white/60">
          {analyzing ? '캐릭터 관계도 생성 중... (1~2분 소요)' : '저장된 데이터 불러오는 중...'}
        </p>
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
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-white/40">
        <Users className="w-12 h-12" />
        <p>분석할 대본 데이터가 없습니다.</p>
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
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'canvas' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">그래프</span>
            </button>
            <button
              onClick={() => setViewMode('chord')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'chord' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">코드</span>
            </button>
          </div>
          <a
            href={`/character-graph?assistantId=${assistantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            전체 화면
          </a>
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

      {/* Chord 뷰 */}
      {viewMode === 'chord' && graphData.chord && (
        <div className="flex-1" style={{ minHeight: 400 }}>
          <CharacterChordDiagram
            chord={graphData.chord}
            insights={graphData.insights || []}
          />
        </div>
      )}

      {/* Canvas 뷰 */}
      <div
        ref={containerRef}
        className={`flex-1 relative ${viewMode === 'chord' ? 'hidden' : ''}`}
        style={{ minHeight: 400 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />

        {/* 범례 */}
        <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 w-32 sm:w-40 space-y-2 sm:space-y-3">
          <p className="text-white/60 text-xs font-medium">역할</p>
          <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
            {[
              { role: '주인공', icon: '⭐', color: '#ef4444' },
              { role: '조연', icon: '👤', color: '#3b82f6' },
              { role: '적대자', icon: '🔥', color: '#f97316' },
              { role: '조력자', icon: '🤝', color: '#22c55e' },
              { role: '기타', icon: '👥', color: '#94a3b8' },
            ].map(({ role, icon, color }) => (
              <div key={role} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full inline-block border" style={{ background: `${color}66`, borderColor: `${color}88` }} />
                <span className="text-white/60">{icon} {role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 호버/탭 정보 */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-[#12122a]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 max-w-[200px] sm:max-w-xs">
            <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
            <p className="text-white/60 text-xs mt-1">{hoveredNode.role}</p>
            <p className="text-white/40 text-xs mt-1">{hoveredNode.description}</p>
            {hoveredNode.episodes.length > 0 && (
              <p className="text-white/30 text-xs mt-1">등장: {hoveredNode.episodes.map(e => `${e}화`).join(', ')}</p>
            )}
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-white/30 text-[10px] sm:text-xs space-y-0.5 text-right">
          <p>드래그 — 노드 이동</p>
          <p>빈 공간 드래그 — 캔버스 이동</p>
          <p className="hidden sm:block">마우스 휠 — 줌 인/아웃</p>
          <p className="sm:hidden">핀치 — 줌 인/아웃</p>
        </div>
      </div>
    </div>
  );
}
