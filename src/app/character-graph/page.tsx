'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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

interface CharGraphData {
  assistant: { name: string; specialty: string };
  scripts: { episode: string; fileName: string; length: number }[];
  nodes: CharNode[];
  edges: CharEdge[];
  stats: {
    totalCharacters: number;
    totalRelationships: number;
    analyzedScripts: number;
  };
}

function CharacterGraphContent() {
  const searchParams = useSearchParams();
  const assistantId = searchParams.get('assistantId');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<CharGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredNode, setHoveredNode] = useState<CharNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<CharNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const nodesRef = useRef<CharNode[]>([]);
  const edgesRef = useRef<CharEdge[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isPanning: false, startX: 0, startY: 0 });
  const transformRef = useRef(transform);

  // 데이터 로드
  useEffect(() => {
    if (!assistantId) {
      setError('보조작가를 선택해주세요. 메인 페이지에서 보조작가를 활성화한 후 이 페이지를 열어주세요.');
      setLoading(false);
      return;
    }

    fetch(`/api/character-graph?assistantId=${assistantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setGraphData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [assistantId]);

  // 시뮬레이션 초기화
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 초기 위치 — 원형 배치
    const nodes = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });

    nodesRef.current = nodes;
    edgesRef.current = graphData.edges;
    transformRef.current = { x: 0, y: 0, scale: 1 };
    setTransform({ x: 0, y: 0, scale: 1 });

    startSimulation();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [graphData]);

  const startSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / 2;
    const height = canvas.height / 2;
    let alpha = 1;

    function tick() {
      if (!ctx) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const t = transformRef.current;

      alpha *= 0.995;
      if (alpha < 0.001) alpha = 0;

      // 중심 인력
      for (const node of nodes) {
        if (node.fx !== null && node.fx !== undefined) continue;
        node.vx! += (width / 2 - node.x!) * 0.0008 * (alpha > 0 ? 1 : 0);
        node.vy! += (height / 2 - node.y!) * 0.0008 * (alpha > 0 ? 1 : 0);
      }

      // 노드 간 반발력
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

      // 엣지 인력
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
          node.x = node.fx;
          node.y = node.fy!;
          node.vx = 0;
          node.vy = 0;
        } else {
          node.vx! *= 0.85;
          node.vy! *= 0.85;
          node.x! += node.vx!;
          node.y! += node.vy!;
        }
      }

      // 렌더링
      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, width, height);

      // 배경
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, width, height);

      // 그리드
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = (t.x % 50); x < width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = (t.y % 50); y < height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // 엣지 렌더링
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

        // 관계 라벨
        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        ctx.font = '9px "Pretendard", "Apple SD Gothic Neo", sans-serif';
        ctx.fillStyle = edge.color + 'cc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 배경
        const labelWidth = ctx.measureText(edge.type).width + 8;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(midX - labelWidth / 2, midY - 7, labelWidth, 14);
        ctx.fillStyle = edge.color + 'cc';
        ctx.fillText(edge.type, midX, midY);
      }

      // 노드 렌더링
      for (const node of nodes) {
        const r = node.size;
        const color = node.color;

        // 글로우
        const gradient = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        gradient.addColorStop(0, `${color}30`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
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
        const roleIcon: Record<string, string> = {
          '주인공': '⭐', '조연': '👤', '적대자': '🔥', '조력자': '🤝', '기타': '👥',
        };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roleIcon[node.role] || '👤', node.x!, node.y!);

        // 이름 라벨
        ctx.font = `bold 11px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
        ctx.fillStyle = '#ffffffdd';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + r + 14);

        // 역할 보조 라벨
        ctx.font = `9px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
        ctx.fillStyle = `${color}aa`;
        ctx.fillText(node.role, node.x!, node.y! + r + 26);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    }

    tick();
  }, []);

  // 마우스 이벤트
  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (e.clientX - rect.left - t.x) / t.scale,
      y: (e.clientY - rect.top - t.y) / t.scale,
    };
  }, []);

  const findNodeAt = useCallback((x: number, y: number): CharNode | null => {
    for (const node of [...nodesRef.current].reverse()) {
      const dx = node.x! - x;
      const dy = node.y! - y;
      if (dx * dx + dy * dy <= node.size * node.size * 2) return node;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    mouseRef.current.isDown = true;
    mouseRef.current.startX = e.clientX;
    mouseRef.current.startY = e.clientY;

    if (node) {
      setDraggedNode(node);
      node.fx = node.x;
      node.fy = node.y;
    } else {
      mouseRef.current.isPanning = true;
    }
  }, [getCanvasPos, findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    setHoveredNode(node);

    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? 'grab' : 'default';
    }

    if (draggedNode && mouseRef.current.isDown) {
      draggedNode.fx = pos.x;
      draggedNode.fy = pos.y;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }

    if (mouseRef.current.isPanning && mouseRef.current.isDown) {
      const dx = e.clientX - mouseRef.current.startX;
      const dy = e.clientY - mouseRef.current.startY;
      mouseRef.current.startX = e.clientX;
      mouseRef.current.startY = e.clientY;
      const newT = { ...transformRef.current, x: transformRef.current.x + dx, y: transformRef.current.y + dy };
      transformRef.current = newT;
      setTransform(newT);
    }
  }, [getCanvasPos, findNodeAt, draggedNode]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      setDraggedNode(null);
    }
    mouseRef.current.isDown = false;
    mouseRef.current.isPanning = false;
  }, [draggedNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, transformRef.current.scale * delta));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newT = {
      x: mouseX - (mouseX - transformRef.current.x) * (newScale / transformRef.current.scale),
      y: mouseY - (mouseY - transformRef.current.y) * (newScale / transformRef.current.scale),
      scale: newScale,
    };
    transformRef.current = newT;
    setTransform(newT);
  }, []);

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">캐릭터 관계도 생성 중...</p>
          <p className="text-white/40 text-sm mt-2">AI가 대본을 분석하고 있습니다 (최대 1~2분)</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">오류 발생</p>
          <p className="text-red-300/70">{error}</p>
          <a href="/" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 underline">← 메인으로 돌아가기</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a1a]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <a href="/" className="text-white/50 hover:text-white/80 transition text-sm">← 돌아가기</a>
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
            🎭 캐릭터 관계도
          </h1>
          {graphData && (
            <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
              {graphData.assistant.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <span>캐릭터 <b className="text-rose-400">{graphData?.stats.totalCharacters || 0}</b></span>
          <span>관계 <b className="text-pink-400">{graphData?.stats.totalRelationships || 0}</b></span>
          <span>분석 대본 <b className="text-amber-400">{graphData?.stats.analyzedScripts || 0}</b></span>
        </div>
      </header>

      {/* 메인 영역 */}
      <div className="flex-1 relative">
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
        <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 w-56 space-y-3">
          <p className="text-white/60 text-xs font-medium">캐릭터 역할</p>
          <div className="space-y-1.5 text-xs">
            {[
              { role: '주인공', color: '#f43f5e', icon: '⭐' },
              { role: '조연', color: '#6366f1', icon: '👤' },
              { role: '적대자', color: '#ef4444', icon: '🔥' },
              { role: '조력자', color: '#22c55e', icon: '🤝' },
            ].map(r => (
              <div key={r.role} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full inline-block border" style={{ background: `${r.color}66`, borderColor: `${r.color}88` }} />
                <span className="text-white/60">{r.icon} {r.role}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-2">
            <p className="text-white/60 text-xs font-medium mb-1.5">관계 유형</p>
            <div className="space-y-1 text-xs">
              {[
                { type: '가족', color: '#22c55e' },
                { type: '연인', color: '#ec4899' },
                { type: '동료', color: '#6366f1' },
                { type: '적대', color: '#ef4444' },
              ].map(r => (
                <div key={r.type} className="flex items-center gap-2">
                  <span className="w-5 border-t-2 inline-block" style={{ borderColor: r.color }} />
                  <span className="text-white/60">{r.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 분석 대본 목록 */}
          {graphData && graphData.scripts.length > 0 && (
            <div className="border-t border-white/5 pt-2">
              <p className="text-white/60 text-xs font-medium mb-1.5">분석 대본</p>
              <div className="space-y-1 text-xs">
                {graphData.scripts.map((s, i) => (
                  <p key={i} className="text-white/40 truncate" title={s.fileName}>📜 {s.fileName}</p>
                ))}
              </div>
            </div>
          )}
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

        {/* 조작 안내 */}
        <div className="absolute bottom-4 right-4 text-white/30 text-xs space-y-0.5 text-right">
          <p>마우스 드래그 — 노드 이동</p>
          <p>빈 공간 드래그 — 캔버스 이동</p>
          <p>마우스 휠 — 줌 인/아웃</p>
        </div>
      </div>
    </div>
  );
}

export default function CharacterGraphPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    }>
      <CharacterGraphContent />
    </Suspense>
  );
}
