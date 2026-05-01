'use client';

import { useState } from 'react';
import { Bot, ChevronDown, Plus, CheckCircle2, Pin, Trash2, Users, Sparkles, Save, Settings, RotateCcw } from 'lucide-react';
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
    handleUpdateResponseStyle,
    handleDeleteAssistant,
  } = assistantsHook;

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingResponseStyle, setEditingResponseStyle] = useState('');
  const [savingStyle, setSavingStyle] = useState(false);

  const DEFAULT_RESPONSE_STYLE = `당신은 메인 작가의 창작을 돕는 보조작가입니다. 직접 대본이나 시나리오를 작성하지 마세요.

당신의 역할:
- 상황에 맞는 아이디어, 모티브, 영감을 제공
- 학습한 자료를 기반으로 관련 사례, 패턴, 참고점 제시
- 캐릭터, 구조, 갈등 등에 대한 분석적 의견 제공
- 메인 작가가 스스로 선택할 수 있도록 여러 아이디어 제안

하지 말아야 할 것:
- 완성된 대사나 장면을 직접 작성하기
- 시나리오형태로 작성하기 (요청시에는 해야함)
- 대본 형식으로 답변하기
- 작가가 하지 말라고 하는 것 반복하기`;

  const openSettings = () => {
    setEditingResponseStyle(activeAssistant?.response_style || DEFAULT_RESPONSE_STYLE);
    setShowSettings(true);
  };

  const handleSaveStyle = async () => {
    if (!activeAssistant) return;
    setSavingStyle(true);
    // 기본값과 같으면 NULL로 저장 (DB에 커스텀 값만 보관)
    const styleToSave = editingResponseStyle.trim() === DEFAULT_RESPONSE_STYLE.trim()
      ? null
      : editingResponseStyle.trim();
    await handleUpdateResponseStyle(activeAssistant.id, styleToSave);
    setSavingStyle(false);
    setShowSettings(false);
  };

  const handleResetStyle = () => {
    setEditingResponseStyle(DEFAULT_RESPONSE_STYLE);
  };

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
              <CheckCircle2 className="w-3.5 h-3.5 text-terracotta shrink-0" />
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
                <CheckCircle2 className="w-3.5 h-3.5 text-terracotta shrink-0" />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete({ id: a.id, name: a.name });
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5 rounded transition-all shrink-0"
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
            <Plus className="w-3.5 h-3.5 mr-2 text-terracotta" />
            <p className="text-sm text-terracotta font-medium">새 보조작가 만들기</p>
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
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-terracotta" />
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
                    <Save className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
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

      {/* 활성 보조작가 상태 배지 + 설정 버튼 */}
      {activeAssistant && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 bg-accent text-accent-foreground border-0">
            <CheckCircle2 className="w-3 h-3 mr-0.5" />
            활성
          </Badge>
          {activeAssistant.data_store_id && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 bg-secondary text-secondary-foreground border-0">
              데이터 스토어
            </Badge>
          )}
          <button
            onClick={openSettings}
            className="ml-auto p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="보조작가 설정"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
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

      {/* 보조작가 설정 다이얼로그 (응답 스타일) */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              보조작가 설정 — {activeAssistant?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">응답 스타일 지침</label>
              <Textarea
                value={editingResponseStyle}
                onChange={(e) => setEditingResponseStyle(e.target.value)}
                placeholder="보조작가의 응답 방식을 지정하세요..."
                rows={10}
                className="text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                보조작가가 답변하는 방식을 직접 지정할 수 있습니다.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetStyle}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              기본값으로 초기화
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowSettings(false)}>
                취소
              </Button>
              <Button onClick={handleSaveStyle} disabled={savingStyle}>
                {savingStyle ? '저장 중...' : '저장'}
              </Button>
            </div>
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
