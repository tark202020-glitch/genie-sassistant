'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SettingNode, SettingEdge } from '@/types/script-organizer';
import { SETTING_TYPE_COLORS, SETTING_TYPE_LABELS, SETTING_RELATION_LABELS } from '@/types/script-organizer';

interface SettingCanvasProps {
  nodes: SettingNode[];
  edges: SettingEdge[];
}

// iOS Safari 캔버스 최대 크기 제한
function getSafeCanvasScale(width: number, height: number): number {
  const MAX_PIXELS = 16_000_000;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
  const totalPixels = width * dpr * height * dpr;
  if (totalPixels > MAX_PIXELS) {
    return Math.sqrt(MAX_PIXELS / (width * height));
  }
  return dpr;
}

function getTouchPos(touch: { clientX: number; clientY: number }, rect: DOMRect, t: { x: number; y: number; scale: number }) {
  return {
    x: (touch.clientX - rect.left - t.x) / t.scale,
    y: (touch.clientY - rect.top - t.y) / t.scale,
  };
}

export function SettingCanvas({ nodes: initialNodes, edges: initialEdges }: SettingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SettingNode[]>([]);
  const edgesRef = useRef<SettingEdge[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isPanning: false, startX: 0, startY: 0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const draggedNodeRef = useRef<SettingNode | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number; dist?: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SettingNode | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // 컨테이너 크기 감시
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

  const findNodeAt = useCallback((x: number, y: number) => {
    for (const n of [...nodesRef.current].reverse()) {
      const dx = n.x! - x, dy = n.y! - y;
      if (dx * dx + dy * dy <= n.size * n.size * 2) return n;
    }
    return null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (containerSize.w === 0 || containerSize.h === 0) return;

    const width = containerSize.w;
    const height = containerSize.h;
    const scale = getSafeCanvasScale(width, height);

    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
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
          const force = (200 * 200) / (dist * dist) * (alpha > 0 ? 1 : 0);
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
        const targetDist = 180;
        const force = (dist - targetDist) * 0.004 * (alpha > 0 ? 1 : 0);
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

      for (const node of currentNodes) {
        const r = node.size;
        const color = node.color;

        const glow = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        glow.addColorStop(0, `${color}25`);
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

        const typeIcon: Record<string, string> = { indoor: '🏠', outdoor: '🌳', vehicle: '🚗', virtual: '💻', other: '📍' };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeIcon[node.type] || '📍', node.x!, node.y!);

        ctx.font = 'bold 16px "Pretendard", sans-serif';
        const nw = ctx.measureText(node.label).width + 14;
        ctx.fillStyle = '#0a0a1acc';
        ctx.fillRect(node.x! - nw / 2, node.y! + r + 4, nw, 22);
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x!, node.y! + r + 18);

        ctx.font = '12px "Pretendard", sans-serif';
        ctx.fillStyle = `${color}cc`;
        ctx.fillText(SETTING_TYPE_LABELS[node.type] || node.type, node.x!, node.y! + r + 36);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [initialNodes, initialEdges, containerSize]);

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
    if (node) { draggedNodeRef.current = node; node.fx = node.x; node.fy = node.y; }
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
    if (dn) { dn.fx = null; dn.fy = null; draggedNodeRef.current = null; }
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
      if (node) { draggedNodeRef.current = node; node.fx = node.x; node.fy = node.y; }
      else mouseRef.current.isPanning = true;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
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
        dn.fx = pos.x; dn.fy = pos.y;
      } else if (mouseRef.current.isPanning) {
        const dx = touch.clientX - lastTouchRef.current.x;
        const dy = touch.clientY - lastTouchRef.current.y;
        transformRef.current = { ...t, x: t.x + dx, y: t.y + dy };
      }
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastTouchRef.current?.dist) {
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
    if (dn) { dn.fx = null; dn.fy = null; draggedNodeRef.current = null; }
    mouseRef.current.isDown = false;
    mouseRef.current.isPanning = false;
    lastTouchRef.current = null;
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: 400 }}>
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
      <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 w-36 sm:w-48 space-y-2 sm:space-y-3">
        <p className="text-white/60 text-xs font-medium">공간 유형</p>
        <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
          {Object.entries(SETTING_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full inline-block border" style={{ background: `${color}66`, borderColor: `${color}88` }} />
              <span className="text-white/60">
                {{ indoor: '🏠', outdoor: '🌳', vehicle: '🚗', virtual: '💻', other: '📍' }[type]} {SETTING_TYPE_LABELS[type]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 호버 정보 */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-[#12122a]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 max-w-[200px] sm:max-w-xs">
          <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
          <p className="text-white/60 text-xs mt-1">{SETTING_TYPE_LABELS[hoveredNode.type]}</p>
          <p className="text-white/40 text-xs mt-1">{hoveredNode.description}</p>
          <p className="text-white/30 text-xs mt-1">등장 {hoveredNode.frequency}회 · {hoveredNode.episodes.map(e => `${e}화`).join(', ')}</p>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-white/30 text-[10px] sm:text-xs space-y-0.5 text-right">
        <p>드래그 — 노드 이동</p>
        <p>빈 공간 드래그 — 캔버스 이동</p>
        <p className="hidden sm:block">마우스 휠 — 줌 인/아웃</p>
        <p className="sm:hidden">핀치 — 줌 인/아웃</p>
      </div>
    </div>
  );
}
