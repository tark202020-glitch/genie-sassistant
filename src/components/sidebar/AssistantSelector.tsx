'use client';

import { useState } from 'react';
import { Bot, ChevronDown, Plus, CheckCircle2, Pin, Trash2, Users, Sparkles, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { useAssistants } from '@/hooks/use-assistants';

interface AssistantSelectorProps {
  assistantsHook: ReturnType<typeof useAssistants>;
  savedGraphs: { id: string; name: string; updated_at: string }[];
}

export function AssistantSelector({ assistantsHook, savedGraphs }: AssistantSelectorProps) {
  const {
    assistants,
    activeAssistantId,
    setActiveAssistantId,
    activeAssistant,
    showCreateForm,
    setShowCreateForm,
    newName,
    setNewName,
    newSpecialty,
    setNewSpecialty,
    newPersona,
    setNewPersona,
    creating,
    handleCreateAssistant,
    handleDeleteAssistant,
  } = assistantsHook;

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="p-3 border-b border-border bg-background/50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-auto py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-base font-medium truncate">
                  {activeAssistant ? activeAssistant.name : '기본 모드'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {activeAssistant ? activeAssistant.specialty : '공유 학습자료 기반'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-sm">보조작가 전환</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* 기본 모드 */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setActiveAssistantId(null)}
          >
            <Bot className="w-3.5 h-3.5 mr-2 opacity-50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">기본 모드</p>
              <p className="text-xs text-muted-foreground">공유 학습자료 기반</p>
            </div>
            {!activeAssistantId && (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            )}
          </DropdownMenuItem>

          {assistants.length > 0 && <DropdownMenuSeparator />}

          {/* 보조작가 목록 */}
          {assistants.map((a) => (
            <DropdownMenuItem
              key={a.id}
              className="cursor-pointer group"
              onClick={() => setActiveAssistantId(a.id)}
            >
              <Bot className="w-3.5 h-3.5 mr-2" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate flex items-center gap-1">
                  {a.name}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-0.5">
                  <Pin className="w-2.5 h-2.5" />
                  {a.specialty}
                </p>
              </div>
              {activeAssistantId === a.id ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ id: a.id, name: a.name });
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 rounded transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* 새 보조작가 만들기 */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-2 text-purple-400" />
            <p className="text-sm text-purple-400 font-medium">새 보조작가 만들기</p>
          </DropdownMenuItem>

          {/* 캐릭터 관계도 (활성 보조작가가 있을 때만) */}
          {activeAssistant && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> 캐릭터 관계도
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a
                  href={`/character-graph?assistantId=${activeAssistant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm">새로 생성</p>
                    <p className="text-xs text-muted-foreground">AI 분석 (시간 소요)</p>
                  </div>
                </a>
              </DropdownMenuItem>
              {savedGraphs.map((g) => (
                <DropdownMenuItem key={g.id} asChild>
                  <a
                    href={`/character-graph?assistantId=${activeAssistant.id}&graphId=${g.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 mr-2 text-rose-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.updated_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </a>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 활성 보조작가 상태 배지 */}
      {activeAssistant && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 bg-green-500/20 text-green-400 border-0">
            <CheckCircle2 className="w-3 h-3 mr-0.5" />
            활성
          </Badge>
          {activeAssistant.data_store_id && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 bg-blue-500/20 text-blue-400 border-0">
              데이터 스토어
            </Badge>
          )}
        </div>
      )}

      {/* 보조작가 생성 다이얼로그 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              보조작가 생성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름 (예: 역사 전문가)"
            />
            <Input
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="전문 분야 (예: 한국 근대사)"
            />
            <Textarea
              value={newPersona}
              onChange={(e) => setNewPersona(e.target.value)}
              placeholder="커스텀 페르소나 (선택사항)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
              취소
            </Button>
            <Button onClick={handleCreateAssistant} disabled={!newName || !newSpecialty || creating}>
              {creating ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) handleDeleteAssistant(confirmDelete.id, confirmDelete.name);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        title="보조작가 삭제"
        description={`"${confirmDelete?.name}" 보조작가를 삭제하시겠습니까?\n전용 데이터 스토어와 학습자료도 함께 삭제됩니다.`}
        confirmLabel="삭제"
        variant="destructive"
      />
    </div>
  );
}
