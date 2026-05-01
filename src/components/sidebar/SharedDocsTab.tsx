'use client';

import { Upload, FileText, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadProgress } from '@/components/shared/UploadProgress';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useState } from 'react';
import type { LearnedDocument, UploadStep } from '@/types';

interface SharedDocsTabProps {
  documents: LearnedDocument[];
  loadingDocs: boolean;
  files: File[];
  setFiles: (files: File[]) => void;
  uploadStep: UploadStep;
  uploadMessage: string;
  deletingDocId: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: () => void;
  onDelete: (doc: LearnedDocument) => void;
  onRefresh: () => void;
  onClearUpload: () => void;
}

export function SharedDocsTab({
  documents,
  loadingDocs,
  files,
  setFiles,
  uploadStep,
  uploadMessage,
  deletingDocId,
  fileInputRef,
  onUpload,
  onDelete,
  onRefresh,
  onClearUpload,
}: SharedDocsTabProps) {
  const [confirmDoc, setConfirmDoc] = useState<LearnedDocument | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 업로드 */}
      <div className="p-3 border-b border-border bg-background/50">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer mb-2"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1.5">
            {files.length}개 파일 선택됨: {files.map((f) => f.name).join(', ')}
          </p>
        )}
        <Button
          onClick={onUpload}
          disabled={files.length === 0 || uploadStep !== 'idle'}
          className="w-full"
        >
          {uploadStep !== 'idle' && uploadStep !== 'error' ? (
            <>학습 진행 중...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              학습하기
            </>
          )}
        </Button>
      </div>

      <UploadProgress step={uploadStep} message={uploadMessage} onClose={onClearUpload} />

      {/* 문서 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loadingDocs ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            등록된 학습자료가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {documents.map((doc) => (
              <div
                key={doc.id || doc.source}
                className={`px-3 py-3 hover:bg-muted/50 transition-all group ${
                  deletingDocId === (doc.id || doc.source) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {doc.source}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.indexed ? '인덱싱 완료' : '대기 중'}
                      {doc.indexTime ? ` · ${doc.indexTime}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDoc(doc)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all"
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
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loadingDocs}>
          <RefreshCw className="w-3 h-3 mr-1" />
          새로고침
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirmDoc}
        onConfirm={() => {
          if (confirmDoc) onDelete(confirmDoc);
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
