'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SettingNode, SettingEdge } from '@/types/script-organizer';
import { SETTING_TYPE_COLORS, SETTING_TYPE_LABELS, SETTING_RELATION_LABELS } from '@/types/script-organizer';

interface SettingCanvasProps {
  nodes: SettingNode[];
  edges: SettingEdge[];
}

export function SettingCanvas({ nodes: initialNodes, edges: initialEdges }: SettingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SettingNode[]>([]);
  const edgesRef = useRef<SettingEdge[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isPanning: false, startX: 0, startY: 0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<SettingNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<SettingNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const nodes = initialNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / initialNodes.length;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });

    nodesRef.current = nodes;
    edgesRef.current = initialEdges;
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

      // 물리 시뮬레이션
      for (const node of nodes) {
        if (node.fx !== null && node.fx !== undefined) continue;
        node.vx! += (w / 2 - node.x!) * 0.0008 * (alpha > 0 ? 1 : 0);
        node.vy! += (h / 2 - node.y!) * 0.0008 * (alpha > 0 ? 1 : 0);
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x! - nodes[i].x!;
          const dy = nodes[j].y! - nodes[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (200 * 200) / (dist * dist) * (alpha > 0 ? 1 : 0);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (nodes[i].fx === null || nodes[i].fx === undefined) { nodes[i].vx! -= fx; nodes[i].vy! -= fy; }
          if (nodes[j].fx === null || nodes[j].fx === undefined) { nodes[j].vx! += fx; nodes[j].vy! += fy; }
        }
      }

      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 180;
        const force = (dist - targetDist) * 0.004 * (alpha > 0 ? 1 : 0);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (source.fx === null || source.fx === undefined) { source.vx! += fx; source.vy! += fy; }
        if (target.fx === null || target.fx === undefined) { target.vx! -= fx; target.vy! -= fy; }
      }

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
        ctx.strokeStyle = edge.color + '88';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        const relLabel = SETTING_RELATION_LABELS[edge.relationship] || edge.relationship;
        ctx.font = 'bold 12px "Pretendard", sans-serif';
        const lw = ctx.measureText(relLabel).width + 12;
        ctx.fillStyle = '#0a0a1aee';
        ctx.fillRect(midX - lw / 2, midY - 9, lw, 18);
        ctx.fillStyle = edge.color + 'cc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(relLabel, midX, midY);
      }

      // 노드
      for (const node of nodes) {
        const r = node.size;
        const color = node.color;

        // 글로우
        const glow = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        glow.addColorStop(0, `${color}25`);
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

        // 아이콘
        const typeIcon: Record<string, string> = { indoor: '🏠', outdoor: '🌳', vehicle: '🚗', virtual: '💻', other: '📍' };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeIcon[node.type] || '📍', node.x!, node.y!);

        // 이름
        ctx.font = 'bold 16px "Pretendard", sans-serif';
        const nw = ctx.measureText(node.label).width + 14;
        ctx.fillStyle = '#0a0a1acc';
        ctx.fillRect(node.x! - nw / 2, node.y! + r + 4, nw, 22);
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + r + 18);

        // 유형
        ctx.font = '12px "Pretendard", sans-serif';
        ctx.fillStyle = `${color}cc`;
        ctx.fillText(SETTING_TYPE_LABELS[node.type] || node.type, node.x!, node.y! + r + 36);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [initialNodes, initialEdges]);

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

  return (
    <div className="relative w-full h-full">
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
      <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 w-48 space-y-3">
        <p className="text-white/60 text-xs font-medium">공간 유형</p>
        <div className="space-y-1.5 text-xs">
          {Object.entries(SETTING_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full inline-block border" style={{ background: `${color}66`, borderColor: `${color}88` }} />
              <span className="text-white/60">
                {{ indoor: '🏠', outdoor: '🌳', vehicle: '🚗', virtual: '💻', other: '📍' }[type]} {SETTING_TYPE_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 호버 정보 */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-[#12122a]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 max-w-xs">
          <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
          <p className="text-white/60 text-xs mt-1">{SETTING_TYPE_LABELS[hoveredNode.type]}</p>
          <p className="text-white/40 text-xs mt-1">{hoveredNode.description}</p>
          <p className="text-white/30 text-xs mt-1">등장 {hoveredNode.frequency}회 · {hoveredNode.episodes.map(e => `${e}화`).join(', ')}</p>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-white/30 text-xs space-y-0.5 text-right">
        <p>드래그 — 노드 이동</p>
        <p>빈 공간 드래그 — 캔버스 이동</p>
        <p>마우스 휠 — 줌 인/아웃</p>
      </div>
    </div>
  );
}
