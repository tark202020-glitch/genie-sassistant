'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Upload, FileText, Scroll, BookOpen, Trash2, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DocSummaryModal } from '@/components/shared/DocSummaryModal';
import type { useDocuments } from '@/hooks/use-documents';
import type { useAssistants } from '@/hooks/use-assistants';
import type { LearnedDocument } from '@/types';

interface DocumentsSectionProps {
  documents: ReturnType<typeof useDocuments>;
  assistantsHook: ReturnType<typeof useAssistants>;
}

export function DocumentsSection({ documents, assistantsHook }: DocumentsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirmDoc, setConfirmDoc] = useState<LearnedDocument | null>(null);
  const [confirmSource, setConfirmSource] = useState<'shared' | 'assistant'>('shared');
  const [summaryDoc, setSummaryDoc] = useState<LearnedDocument | null>(null);

  const activeAssistant = assistantsHook.activeAssistant;
  const assistantDocs = assistantsHook.assistantDocs;
  const scripts = assistantDocs.filter((d) => d.docType !== 'reference');
  const references = assistantDocs.filter((d) => d.docType === 'reference');

  // 보조작가 전환 시 showAll 리셋
  useEffect(() => {
    setShowAll(false);
  }, [activeAssistant?.id]);

  // 모드별 요약 텍스트
  const summaryText = activeAssistant
    ? (assistantDocs.length > 0
        ? [scripts.length > 0 && `대본 ${scripts.length}`, references.length > 0 && `자료 ${references.length}`].filter(Boolean).join(' · ') || '없음'
        : '없음')
    : (documents.documents.length > 0 ? `${documents.documents.length}개 자료` : '없음');

  // 현재 모드의 문서 수
  const docCount = activeAssistant ? assistantDocs.length : documents.documents.length;

  return (
    <div className="border-t border-border">
      {/* 접힌 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">학습자료</span>
          {activeAssistant && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
              · {activeAssistant.name}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">{summaryText}</span>
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          <div
            key={activeAssistant?.id ?? 'shared'}
            className="animate-in fade-in duration-200"
          >
            {activeAssistant ? (
              <AssistantDocContent
                assistantsHook={assistantsHook}
                showAll={showAll}
                onDeleteRequest={(doc) => {
                  setConfirmDoc(doc);
                  setConfirmSource('assistant');
                }}
                onDocClick={setSummaryDoc}
              />
            ) : (
              <SharedDocContent
                documents={documents}
                showAll={showAll}
                onDeleteRequest={(doc) => {
                  setConfirmDoc(doc);
                  setConfirmSource('shared');
                }}
                onDocClick={setSummaryDoc}
              />
            )}
          </div>

          {/* 더 보기 토글 */}
          {docCount > 6 && (
            <div className="px-3 py-1.5 border-t border-border/30">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    접기
                  </>
                ) : (
                  `+${docCount - 6}개 더 보기`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDoc}
        onConfirm={() => {
          if (confirmDoc) {
            if (confirmSource === 'shared') {
              documents.handleDeleteDocument(confirmDoc);
            } else {
              assistantsHook.handleDeleteAssistantDoc(confirmDoc);
            }
          }
          setConfirmDoc(null);
        }}
        onCancel={() => setConfirmDoc(null)}
        title="문서 삭제"
        description={`"${confirmDoc?.source}" 문서를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
      />

      <DocSummaryModal
        doc={summaryDoc}
        assistantId={activeAssistant?.id}
        open={!!summaryDoc}
        onClose={() => setSummaryDoc(null)}
      />
    </div>
  );
}

function SharedDocContent({
  documents,
  showAll,
  onDeleteRequest,
  onDocClick,
}: {
  documents: ReturnType<typeof useDocuments>;
  showAll: boolean;
  onDeleteRequest: (doc: LearnedDocument) => void;
  onDocClick: (doc: LearnedDocument) => void;
}) {
  return (
    <div className={`${showAll ? 'max-h-[50vh]' : 'max-h-80'} flex flex-col transition-all duration-300`}>
      {/* 업로드 */}
      <div className="px-3 py-2">
        <input
          ref={documents.fileInputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          onChange={(e) => documents.setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer mb-1.5"
        />
        {documents.files.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1">{documents.files.length}개 파일 선택됨</p>
        )}
        <Button
          onClick={documents.handleFileUpload}
          disabled={documents.files.length === 0 || documents.uploadStep !== 'idle'}
          size="sm"
          className="w-full text-sm h-8"
        >
          {documents.uploadStep !== 'idle' && documents.uploadStep !== 'error' ? (
            '학습 중...'
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1" />
              학습하기
            </>
          )}
        </Button>
      </div>

      <UploadProgress step={documents.uploadStep} message={documents.uploadMessage} onClose={documents.clearUploadState} />

      {/* 문서 목록 */}
      <ScrollArea className="flex-1">
        {documents.loadingDocs ? (
          <div className="px-3 py-2 space-y-1.5">
            {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : documents.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">공유 학습자료 없음</p>
        ) : (
          <div className="divide-y divide-border/30">
            {documents.documents.map((doc) => (
              <DocItem
                key={doc.id || doc.source}
                doc={doc}
                icon={FileText}
                onDelete={() => onDeleteRequest(doc)}
                onClick={() => onDocClick(doc)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function AssistantDocContent({
  assistantsHook,
  showAll,
  onDeleteRequest,
  onDocClick,
}: {
  assistantsHook: ReturnType<typeof useAssistants>;
  showAll: boolean;
  onDeleteRequest: (doc: LearnedDocument) => void;
  onDocClick: (doc: LearnedDocument) => void;
}) {
  const scripts = assistantsHook.assistantDocs.filter((d) => d.docType !== 'reference');
  const references = assistantsHook.assistantDocs.filter((d) => d.docType === 'reference');

  return (
    <div className={`${showAll ? 'max-h-[50vh]' : 'max-h-80'} flex flex-col transition-all duration-300`}>
      {/* 업로드 */}
      <div className="px-3 py-2">
        <div className="flex gap-1 mb-1.5">
          <Button
            variant={assistantsHook.assistantDocType === 'script' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => assistantsHook.setAssistantDocType('script')}
            className={`flex-1 h-7 text-xs ${assistantsHook.assistantDocType === 'script' ? 'bg-terracotta/15 text-terracotta border border-terracotta/30 hover:bg-terracotta/25' : ''}`}
          >
            <Scroll className="w-3 h-3 mr-0.5" />
            대본
          </Button>
          <Button
            variant={assistantsHook.assistantDocType === 'reference' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => assistantsHook.setAssistantDocType('reference')}
            className={`flex-1 h-7 text-xs ${assistantsHook.assistantDocType === 'reference' ? 'bg-accent text-accent-foreground border border-accent hover:bg-accent/80' : ''}`}
          >
            <BookOpen className="w-3 h-3 mr-0.5" />
            자료
          </Button>
        </div>
        <input
          ref={assistantsHook.assistantFileInputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          onChange={(e) => assistantsHook.setAssistantFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer mb-1.5"
        />
        {assistantsHook.assistantFiles.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1">{assistantsHook.assistantFiles.length}개 파일 선택됨</p>
        )}
        <Button
          onClick={assistantsHook.handleAssistantFileUpload}
          disabled={assistantsHook.assistantFiles.length === 0 || assistantsHook.assistantUploadStep !== 'idle'}
          size="sm"
          className="w-full text-sm h-8 bg-terracotta hover:bg-terracotta/90 text-white"
        >
          {assistantsHook.assistantUploadStep !== 'idle' && assistantsHook.assistantUploadStep !== 'error' ? (
            '학습 중...'
          ) : assistantsHook.assistantDocType === 'script' ? (
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

      <UploadProgress step={assistantsHook.assistantUploadStep} message={assistantsHook.assistantUploadMessage} onClose={assistantsHook.clearAssistantUploadState} />

      {/* 문서 목록 */}
      <ScrollArea className="flex-1">
        {assistantsHook.loadingAssistantDocs ? (
          <div className="px-3 py-2 space-y-1.5">
            {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : assistantsHook.assistantDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">전용 학습자료 없음</p>
        ) : (
          <div className="divide-y divide-border/30">
            {scripts.length > 0 && (
              <div className="px-3 py-1 bg-muted/30 sticky top-0 z-10">
                <p className="text-[11px] font-semibold text-terracotta uppercase tracking-wider flex items-center gap-1">
                  <Scroll className="w-3 h-3" /> 대본 ({scripts.length})
                </p>
              </div>
            )}
            {scripts.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={Scroll} onDelete={() => onDeleteRequest(doc)} onClick={() => onDocClick(doc)} />
            ))}
            {references.length > 0 && (
              <div className="px-3 py-1 bg-muted/30 sticky top-0 z-10">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> 자료 ({references.length})
                </p>
              </div>
            )}
            {references.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={BookOpen} onDelete={() => onDeleteRequest(doc)} onClick={() => onDocClick(doc)} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function DocItem({
  doc,
  icon: Icon,
  onDelete,
  onClick,
}: {
  doc: LearnedDocument;
  icon: React.ComponentType<{ className?: string }>;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div className="px-3 py-1.5 hover:bg-muted/50 group flex items-center justify-between gap-2">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
        title="클릭하여 요약 보기"
      >
        <p className="text-sm text-foreground truncate flex items-center gap-1.5 group-hover:text-primary transition-colors">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {doc.source}
        </p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
