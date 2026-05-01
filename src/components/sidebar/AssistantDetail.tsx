'use client';

import { useState } from 'react';
import { ArrowLeft, Target, CheckCircle2, Bot, Pin, Database, Users, Scroll, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Assistant, LearnedDocument, DocType, UploadStep } from '@/types';

interface AssistantDetailProps {
  assistant: Assistant;
  isActive: boolean;
  onActivate: () => void;
  onBack: () => void;
  // 문서 관련
  docs: LearnedDocument[];
  loadingDocs: boolean;
  files: File[];
  setFiles: (files: File[]) => void;
  docType: DocType;
  setDocType: (type: DocType) => void;
  uploadStep: UploadStep;
  uploadMessage: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: () => void;
  onDeleteDoc: (doc: LearnedDocument) => void;
  onClearUpload: () => void;
}

export function AssistantDetail({
  assistant,
  isActive,
  onActivate,
  onBack,
  docs,
  loadingDocs,
  files,
  setFiles,
  docType,
  setDocType,
  uploadStep,
  uploadMessage,
  fileInputRef,
  onUpload,
  onDeleteDoc,
  onClearUpload,
}: AssistantDetailProps) {
  const [confirmDoc, setConfirmDoc] = useState<LearnedDocument | null>(null);
  const scripts = docs.filter((d) => d.docType !== 'reference');
  const references = docs.filter((d) => d.docType === 'reference');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="p-3 border-b border-border bg-background/50">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" />
            목록으로
          </Button>
          <Button
            variant={isActive ? 'secondary' : 'outline'}
            size="sm"
            onClick={onActivate}
            className="h-7 text-xs"
          >
            {isActive ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                활성
              </>
            ) : (
              <>
                <Target className="w-3 h-3 mr-1" />
                채팅에 활성화
              </>
            )}
          </Button>
        </div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
          <Bot className="w-4 h-4" />
          {assistant.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Pin className="w-3 h-3" />
          {assistant.specialty}
        </p>
        {assistant.data_store_id && (
          <p className="text-[10px] text-green-500/70 mt-1 flex items-center gap-1">
            <Database className="w-3 h-3" />
            데이터 스토어 연결됨
          </p>
        )}
        <a
          href={`/character-graph?assistantId=${assistant.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all font-semibold"
        >
          <Users className="w-3.5 h-3.5" />
          캐릭터 관계도 보기
        </a>
      </div>

      {/* 자료 업로드 */}
      <div className="p-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2">학습자료 업로드</p>
        <div className="flex gap-1 mb-2">
          <Button
            variant={docType === 'script' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDocType('script')}
            className={`flex-1 h-7 text-xs ${docType === 'script' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' : ''}`}
          >
            <Scroll className="w-3 h-3 mr-1" />
            대본
          </Button>
          <Button
            variant={docType === 'reference' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDocType('reference')}
            className={`flex-1 h-7 text-xs ${docType === 'reference' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30' : ''}`}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            자료
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer mb-2"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1.5">{files.length}개 파일 선택됨</p>
        )}
        <Button
          onClick={onUpload}
          disabled={files.length === 0 || uploadStep !== 'idle'}
          size="sm"
          className={`w-full text-xs ${
            docType === 'script'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
          }`}
        >
          {uploadStep !== 'idle' && uploadStep !== 'error' ? (
            '학습 중...'
          ) : docType === 'script' ? (
            <>
              <Scroll className="w-3 h-3 mr-1" /> 대본 학습
            </>
          ) : (
            <>
              <BookOpen className="w-3 h-3 mr-1" /> 자료 학습
            </>
          )}
        </Button>
      </div>

      <UploadProgress step={uploadStep} message={uploadMessage} onClose={onClearUpload} />

      {/* 문서 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loadingDocs ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            아직 전문 학습자료가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {scripts.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                  <Scroll className="w-3 h-3" /> 대본
                </p>
              </div>
            )}
            {scripts.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={Scroll} onDelete={() => setConfirmDoc(doc)} />
            ))}
            {references.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> 자료
                </p>
              </div>
            )}
            {references.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={BookOpen} onDelete={() => setConfirmDoc(doc)} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDoc}
        onConfirm={() => {
          if (confirmDoc) onDeleteDoc(confirmDoc);
          setConfirmDoc(null);
        }}
        onCancel={() => setConfirmDoc(null)}
        title="문서 삭제"
        description={`"${confirmDoc?.source}" 문서를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
      />
    </div>
  );
}

function DocItem({
  doc,
  icon: Icon,
  onDelete,
}: {
  doc: LearnedDocument;
  icon: React.ComponentType<{ className?: string }>;
  onDelete: () => void;
}) {
  return (
    <div className="px-3 py-2 hover:bg-muted/50 group flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
          <Icon className="w-3 h-3 shrink-0" />
          {doc.source}
        </p>
        <p className="text-[10px] text-muted-foreground">{doc.indexed ? '완료' : '대기'}</p>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
