'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Save, FolderOpen, Sparkles, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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

interface SavedGraph {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function CharacterGraphContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assistantId = searchParams.get('assistantId');
  const graphId = searchParams.get('graphId');

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

  // 저장/불러오기 관련 상태
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);
  const [currentGraphName, setCurrentGraphName] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedGraph | null>(null);

  // 저장된 그래프 목록 로드
  const fetchSavedGraphs = useCallback(async () => {
    if (!assistantId) return;
    try {
      const res = await fetch(`/api/character-graphs?assistantId=${assistantId}`);
      const data = await res.json();
      if (data.graphs) setSavedGraphs(data.graphs);
    } catch (e) {
      console.error('저장된 관계도 조회 실패:', e);
    }
  }, [assistantId]);

  useEffect(() => {
    fetchSavedGraphs();
  }, [fetchSavedGraphs]);

  // 그래프 데이터 로드
  useEffect(() => {
    if (!assistantId) {
      setError('보조작가를 선택해주세요. 메인 페이지에서 보조작가를 활성화한 후 이 페이지를 열어주세요.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // graphId가 있으면 저장된 그래프 로드, 없으면 새로 생성
    const url = graphId
      ? `/api/character-graphs/${graphId}`
      : `/api/character-graph?assistantId=${assistantId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (graphId && data.graph) {
          setGraphData(data.graph.data);
          setCurrentGraphName(data.graph.name);
        } else {
          setGraphData(data);
          setCurrentGraphName(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [assistantId, graphId]);

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

      for (const node of nodes) {
        if (node.fx !== null && node.fx !== undefined) continue;
        node.vx! += (width / 2 - node.x!) * 0.0008 * (alpha > 0 ? 1 : 0);
        node.vy! += (height / 2 - node.y!) * 0.0008 * (alpha > 0 ? 1 : 0);
      }

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

      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
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

      ctx.save();
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, width, height);

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

      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        ctx.beginPath();
        ctx.moveTo(source.x!, source.y!);
        ctx.lineTo(target.x!, target.y!);
        ctx.strokeStyle = edge.color + 'aa';
        ctx.lineWidth = 1 + edge.weight * 0.8;
        ctx.stroke();

        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        ctx.font = 'bold 14px "Pretendard", "Apple SD Gothic Neo", sans-serif';
        ctx.fillStyle = edge.color + 'cc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelWidth = ctx.measureText(edge.type).width + 14;
        ctx.fillStyle = '#0a0a1aee';
        ctx.fillRect(midX - labelWidth / 2, midY - 11, labelWidth, 22);
        ctx.fillStyle = edge.color + 'ee';
        ctx.fillText(edge.type, midX, midY);
      }

      for (const node of nodes) {
        const r = node.size;
        const color = node.color;

        const gradient = ctx.createRadialGradient(node.x!, node.y!, r * 0.3, node.x!, node.y!, r * 2.5);
        gradient.addColorStop(0, `${color}30`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
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

        const roleIcon: Record<string, string> = {
          '주인공': '⭐', '조연': '👤', '적대자': '🔥', '조력자': '🤝', '기타': '👥',
        };
        ctx.font = `${r > 20 ? 14 : 11}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roleIcon[node.role] || '👤', node.x!, node.y!);

        ctx.font = `bold 18px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
        ctx.fillStyle = '#ffffffee';
        ctx.textAlign = 'center';
        // 이름 배경 (가독성 강화)
        const nameWidth = ctx.measureText(node.label).width + 16;
        ctx.fillStyle = '#0a0a1acc';
        ctx.fillRect(node.x! - nameWidth / 2, node.y! + r + 4, nameWidth, 24);
        ctx.fillStyle = '#ffffffee';
        ctx.fillText(node.label, node.x!, node.y! + r + 20);

        ctx.font = `13px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
        ctx.fillStyle = `${color}cc`;
        ctx.fillText(node.role, node.x!, node.y! + r + 38);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    }

    tick();
  }, []);

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

  // 저장 처리
  const handleSave = useCallback(async () => {
    if (!assistantId || !graphData || !saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/character-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          name: saveName.trim(),
          data: graphData,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`"${saveName}" 관계도 저장 완료`);
        setShowSaveDialog(false);
        setSaveName('');
        await fetchSavedGraphs();
        // 저장한 그래프로 URL 전환
        router.replace(`/character-graph?assistantId=${assistantId}&graphId=${result.graph.id}`);
      } else {
        toast.error(result.error || '저장 실패');
      }
    } catch {
      toast.error('저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  }, [assistantId, graphData, saveName, fetchSavedGraphs, router]);

  // 삭제 처리
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/character-graphs/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`"${deleteTarget.name}" 삭제 완료`);
        // 현재 보고 있는 그래프가 삭제됐으면 새로 생성하는 페이지로 이동
        if (graphId === deleteTarget.id) {
          router.replace(`/character-graph?assistantId=${assistantId}`);
        }
        await fetchSavedGraphs();
      } else {
        toast.error(result.error || '삭제 실패');
      }
    } catch {
      toast.error('삭제 중 오류 발생');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, graphId, assistantId, fetchSavedGraphs, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">
            {graphId ? '저장된 관계도 불러오는 중...' : '캐릭터 관계도 생성 중...'}
          </p>
          {!graphId && (
            <p className="text-white/40 text-sm mt-2">AI가 대본을 분석하고 있습니다 (최대 1~2분)</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">오류 발생</p>
          <p className="text-red-300/70">{error}</p>
          <a href="/" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 underline">
            ← 메인으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a1a]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-white/50 hover:text-white/80 transition text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> 돌아가기
          </a>
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
            🎭 캐릭터 관계도
          </h1>
          {graphData && (
            <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
              {graphData.assistant.name}
            </span>
          )}
          {currentGraphName && (
            <span className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              💾 {currentGraphName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6 text-sm text-white/60 mr-2">
            <span>
              캐릭터 <b className="text-rose-400">{graphData?.stats.totalCharacters || 0}</b>
            </span>
            <span>
              관계 <b className="text-pink-400">{graphData?.stats.totalRelationships || 0}</b>
            </span>
            <span>
              분석 대본 <b className="text-amber-400">{graphData?.stats.analyzedScripts || 0}</b>
            </span>
          </div>

          {/* 저장된 관계도 불러오기 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10">
                <FolderOpen className="w-4 h-4 mr-1.5" />
                불러오기
                {savedGraphs.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                    {savedGraphs.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>저장된 관계도</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.replace(`/character-graph?assistantId=${assistantId}`)}
              >
                <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm">새로 생성하기</p>
                  <p className="text-[10px] text-muted-foreground">AI로 대본 재분석 (시간 소요)</p>
                </div>
              </DropdownMenuItem>
              {savedGraphs.length > 0 && <DropdownMenuSeparator />}
              {savedGraphs.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  저장된 관계도가 없습니다.
                </div>
              ) : (
                savedGraphs.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    onClick={() =>
                      router.replace(`/character-graph?assistantId=${assistantId}&graphId=${g.id}`)
                    }
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(g.updated_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(g);
                      }}
                      className="text-muted-foreground hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 저장하기 */}
          <Button
            size="sm"
            onClick={() => {
              setSaveName(currentGraphName || '');
              setShowSaveDialog(true);
            }}
            disabled={!graphData}
            className="bg-rose-600 hover:bg-rose-500 text-white"
          >
            <Save className="w-4 h-4 mr-1.5" />
            저장하기
          </Button>
        </div>
      </header>

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

        <div className="absolute top-4 left-4 bg-[#12122a]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 w-56 space-y-3">
          <p className="text-white/60 text-xs font-medium">캐릭터 역할</p>
          <div className="space-y-1.5 text-xs">
            {[
              { role: '주인공', color: '#f43f5e', icon: '⭐' },
              { role: '조연', color: '#6366f1', icon: '👤' },
              { role: '적대자', color: '#ef4444', icon: '🔥' },
              { role: '조력자', color: '#22c55e', icon: '🤝' },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full inline-block border"
                  style={{ background: `${r.color}66`, borderColor: `${r.color}88` }}
                />
                <span className="text-white/60">
                  {r.icon} {r.role}
                </span>
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
              ].map((r) => (
                <div key={r.type} className="flex items-center gap-2">
                  <span
                    className="w-5 border-t-2 inline-block"
                    style={{ borderColor: r.color }}
                  />
                  <span className="text-white/60">{r.type}</span>
                </div>
              ))}
            </div>
          </div>

          {graphData && graphData.scripts.length > 0 && (
            <div className="border-t border-white/5 pt-2">
              <p className="text-white/60 text-xs font-medium mb-1.5">분석 대본</p>
              <div className="space-y-1 text-xs">
                {graphData.scripts.map((s, i) => (
                  <p key={i} className="text-white/40 truncate" title={s.fileName}>
                    📜 {s.fileName}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-[#12122a]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 max-w-xs">
            <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
            <p className="text-white/60 text-xs mt-1">{hoveredNode.role}</p>
            <p className="text-white/40 text-xs mt-1">{hoveredNode.description}</p>
            {hoveredNode.episodes.length > 0 && (
              <p className="text-white/30 text-xs mt-1">
                등장: {hoveredNode.episodes.map((e) => `${e}화`).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-white/30 text-xs space-y-0.5 text-right">
          <p>마우스 드래그 — 노드 이동</p>
          <p>빈 공간 드래그 — 캔버스 이동</p>
          <p>마우스 휠 — 줌 인/아웃</p>
        </div>
      </div>

      {/* 저장 다이얼로그 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              관계도 저장
            </DialogTitle>
            <DialogDescription>
              현재 관계도를 저장합니다. 다음에 같은 보조작가에서 빠르게 불러올 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="이름 (예: 1~5화 인물 관계도, V1.0)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveName.trim() && !saving) {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              같은 보조작가 내에서 이름은 중복될 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="관계도 삭제"
        description={`"${deleteTarget?.name}" 관계도를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
      />
    </div>
  );
}

export default function CharacterGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        </div>
      }
    >
      <CharacterGraphContent />
    </Suspense>
  );
}
