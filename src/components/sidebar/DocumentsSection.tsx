'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Upload, FileText, Scroll, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { useDocuments } from '@/hooks/use-documents';
import type { useAssistants } from '@/hooks/use-assistants';
import type { LearnedDocument } from '@/types';

interface DocumentsSectionProps {
  documents: ReturnType<typeof useDocuments>;
  assistantsHook: ReturnType<typeof useAssistants>;
}

type DocTab = 'shared' | 'assistant';

export function DocumentsSection({ documents, assistantsHook }: DocumentsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [docTab, setDocTab] = useState<DocTab>('shared');
  const [confirmDoc, setConfirmDoc] = useState<LearnedDocument | null>(null);
  const [confirmSource, setConfirmSource] = useState<'shared' | 'assistant'>('shared');

  const activeAssistant = assistantsHook.activeAssistant;
  const assistantDocs = assistantsHook.assistantDocs;
  const scripts = assistantDocs.filter((d) => d.docType !== 'reference');
  const references = assistantDocs.filter((d) => d.docType === 'reference');

  const sharedCount = documents.documents.length;
  const assistantDocCount = assistantDocs.length;

  const summaryParts: string[] = [];
  if (sharedCount > 0) summaryParts.push(`공유 ${sharedCount}`);
  if (activeAssistant) {
    if (scripts.length > 0) summaryParts.push(`대본 ${scripts.length}`);
    if (references.length > 0) summaryParts.push(`자료 ${references.length}`);
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(' · ') : '없음';

  return (
    <div className="border-t border-border">
      {/* 접힌 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm font-medium">학습자료 관리</span>
        </div>
        <span className="text-xs text-muted-foreground">{summaryText}</span>
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          {/* 공유/전용 서브탭 */}
          <div className="flex gap-1 px-3 pt-2 pb-1">
            <Button
              variant={docTab === 'shared' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDocTab('shared')}
              className={`flex-1 h-8 text-sm ${docTab === 'shared' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30' : ''}`}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              공유
            </Button>
            <Button
              variant={docTab === 'assistant' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDocTab('assistant')}
              disabled={!activeAssistant}
              className={`flex-1 h-8 text-sm ${docTab === 'assistant' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30' : ''}`}
            >
              <Scroll className="w-3.5 h-3.5 mr-1" />
              전용
            </Button>
          </div>

          {docTab === 'shared' ? (
            <SharedDocContent
              documents={documents}
              onDeleteRequest={(doc) => {
                setConfirmDoc(doc);
                setConfirmSource('shared');
              }}
            />
          ) : (
            <AssistantDocContent
              assistantsHook={assistantsHook}
              onDeleteRequest={(doc) => {
                setConfirmDoc(doc);
                setConfirmSource('assistant');
              }}
            />
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
    </div>
  );
}

function SharedDocContent({
  documents,
  onDeleteRequest,
}: {
  documents: ReturnType<typeof useDocuments>;
  onDeleteRequest: (doc: LearnedDocument) => void;
}) {
  return (
    <div className="max-h-64 flex flex-col">
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
      <div className="overflow-y-auto flex-1">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantDocContent({
  assistantsHook,
  onDeleteRequest,
}: {
  assistantsHook: ReturnType<typeof useAssistants>;
  onDeleteRequest: (doc: LearnedDocument) => void;
}) {
  const activeAssistant = assistantsHook.activeAssistant;
  const scripts = assistantsHook.assistantDocs.filter((d) => d.docType !== 'reference');
  const references = assistantsHook.assistantDocs.filter((d) => d.docType === 'reference');

  if (!activeAssistant) {
    return (
      <p className="text-sm text-muted-foreground text-center py-3">
        보조작가를 활성화하면 전용 학습자료를 관리할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="max-h-64 flex flex-col">
      {/* 업로드 */}
      <div className="px-3 py-2">
        <div className="flex gap-1 mb-1.5">
          <Button
            variant={assistantsHook.assistantDocType === 'script' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => assistantsHook.setAssistantDocType('script')}
            className={`flex-1 h-7 text-xs ${assistantsHook.assistantDocType === 'script' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' : ''}`}
          >
            <Scroll className="w-3 h-3 mr-0.5" />
            대본
          </Button>
          <Button
            variant={assistantsHook.assistantDocType === 'reference' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => assistantsHook.setAssistantDocType('reference')}
            className={`flex-1 h-7 text-xs ${assistantsHook.assistantDocType === 'reference' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30' : ''}`}
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
          className={`w-full text-sm h-8 ${
            assistantsHook.assistantDocType === 'script'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
          }`}
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
      <div className="overflow-y-auto flex-1">
        {assistantsHook.loadingAssistantDocs ? (
          <div className="px-3 py-2 space-y-1.5">
            {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : assistantsHook.assistantDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">전용 학습자료 없음</p>
        ) : (
          <div className="divide-y divide-border/30">
            {scripts.length > 0 && (
              <div className="px-3 pt-1.5 pb-0.5">
                <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                  <Scroll className="w-3 h-3" /> 대본
                </p>
              </div>
            )}
            {scripts.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={Scroll} onDelete={() => onDeleteRequest(doc)} />
            ))}
            {references.length > 0 && (
              <div className="px-3 pt-1.5 pb-0.5">
                <p className="text-xs font-bold text-blue-400/80 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> 자료
                </p>
              </div>
            )}
            {references.map((doc) => (
              <DocItem key={doc.id || doc.source} doc={doc} icon={BookOpen} onDelete={() => onDeleteRequest(doc)} />
            ))}
          </div>
        )}
      </div>
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
        <p className="text-sm text-foreground truncate flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {doc.source}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
