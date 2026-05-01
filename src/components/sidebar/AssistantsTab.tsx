'use client';

import { useState } from 'react';
import { Plus, Bot, Pin, AlertTriangle, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AssistantDetail } from './AssistantDetail';
import type { Assistant, LearnedDocument, DocType, UploadStep } from '@/types';

interface AssistantsTabProps {
  assistants: Assistant[];
  loadingAssistants: boolean;
  selectedAssistant: Assistant | null;
  setSelectedAssistant: (a: Assistant | null) => void;
  activeAssistantId: string | null;
  setActiveAssistantId: (id: string | null) => void;
  // 생성 폼
  showCreateForm: boolean;
  setShowCreateForm: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  newSpecialty: string;
  setNewSpecialty: (v: string) => void;
  newPersona: string;
  setNewPersona: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
  onDelete: (id: string, name: string) => void;
  onRefresh: () => void;
  onSelectAssistant: (a: Assistant) => void;
  // 문서
  assistantDocs: LearnedDocument[];
  loadingAssistantDocs: boolean;
  assistantFiles: File[];
  setAssistantFiles: (files: File[]) => void;
  assistantDocType: DocType;
  setAssistantDocType: (type: DocType) => void;
  assistantUploadStep: UploadStep;
  assistantUploadMessage: string;
  assistantFileInputRef: React.RefObject<HTMLInputElement | null>;
  onAssistantUpload: () => void;
  onDeleteAssistantDoc: (doc: LearnedDocument) => void;
  onClearAssistantUpload: () => void;
  setAssistantDocs: (docs: LearnedDocument[]) => void;
}

export function AssistantsTab({
  assistants,
  loadingAssistants,
  selectedAssistant,
  setSelectedAssistant,
  activeAssistantId,
  setActiveAssistantId,
  showCreateForm,
  setShowCreateForm,
  newName,
  setNewName,
  newSpecialty,
  setNewSpecialty,
  newPersona,
  setNewPersona,
  creating,
  onCreate,
  onDelete,
  onRefresh,
  onSelectAssistant,
  assistantDocs,
  loadingAssistantDocs,
  assistantFiles,
  setAssistantFiles,
  assistantDocType,
  setAssistantDocType,
  assistantUploadStep,
  assistantUploadMessage,
  assistantFileInputRef,
  onAssistantUpload,
  onDeleteAssistantDoc,
  onClearAssistantUpload,
  setAssistantDocs,
}: AssistantsTabProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  if (selectedAssistant) {
    return (
      <AssistantDetail
        assistant={selectedAssistant}
        isActive={activeAssistantId === selectedAssistant.id}
        onActivate={() => setActiveAssistantId(selectedAssistant.id)}
        onBack={() => {
          setSelectedAssistant(null);
          setAssistantDocs([]);
        }}
        docs={assistantDocs}
        loadingDocs={loadingAssistantDocs}
        files={assistantFiles}
        setFiles={setAssistantFiles}
        docType={assistantDocType}
        setDocType={setAssistantDocType}
        uploadStep={assistantUploadStep}
        uploadMessage={assistantUploadMessage}
        fileInputRef={assistantFileInputRef}
        onUpload={onAssistantUpload}
        onDeleteDoc={onDeleteAssistantDoc}
        onClearUpload={onClearAssistantUpload}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 생성 버튼 */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={() => setShowCreateForm(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 보조작가 만들기
        </Button>
      </div>

      {/* 보조작가 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loadingAssistants ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : assistants.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm">보조작가가 없습니다.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              새 보조작가를 만들어 전문 지식을 부여하세요.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {assistants.map((a) => (
              <div
                key={a.id}
                className={`px-3 py-3 hover:bg-muted/50 transition-all cursor-pointer group ${
                  activeAssistantId === a.id ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                }`}
                onClick={() => onSelectAssistant(a)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 shrink-0" />
                      {a.name}
                      {activeAssistantId === a.id && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-green-500/20 text-green-400 border-0">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          활성
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      <Pin className="w-3 h-3 shrink-0" />
                      {a.specialty}
                    </p>
                    {!a.data_store_id && (
                      <p className="text-[10px] text-yellow-500 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        데이터 스토어 미연결
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ id: a.id, name: a.name });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border text-center">
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loadingAssistants}>
          <RefreshCw className="w-3 h-3 mr-1" />
          새로고침
        </Button>
      </div>

      {/* 생성 다이얼로그 */}
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
            <Button onClick={onCreate} disabled={!newName || !newSpecialty || creating}>
              {creating ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete.id, confirmDelete.name);
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
