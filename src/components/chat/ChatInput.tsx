'use client';

import { useRef, useCallback, useState, type FormEvent, type KeyboardEvent, type DragEvent } from 'react';
import { SendHorizontal, Plus, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface ChatAttachment {
  fileName: string;
  fileSize: number;
  text: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  activeAssistantName?: string | null;
  attachments: ChatAttachment[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onAttachFiles: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ChatInput({
  input,
  isLoading,
  activeAssistantName,
  attachments,
  onInputChange,
  onSubmit,
  onAttachFiles,
  onRemoveAttachment,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const hasReadyAttachment = attachments.some(a => a.status === 'ready');
        if ((input.trim() || hasReadyAttachment) && !isLoading) {
          formRef.current?.requestSubmit();
        }
      }
    },
    [input, isLoading, attachments]
  );

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAttachFiles(files);
    }
    e.target.value = '';
  }, [onAttachFiles]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onAttachFiles(files);
    }
  }, [onAttachFiles]);

  const isUploading = attachments.some(a => a.status === 'uploading');
  const hasReadyAttachment = attachments.some(a => a.status === 'ready');
  const canSubmit = (input.trim() || hasReadyAttachment) && !isLoading && !isUploading;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="px-6 py-4 border-t border-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-2 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <FileText className="w-10 h-10" />
            <p className="text-lg font-medium">파일을 여기에 놓으세요</p>
            <p className="text-sm text-muted-foreground">PDF, TXT, MD, CSV 파일 지원</p>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
                att.status === 'error'
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : att.status === 'uploading'
                  ? 'bg-muted border-border text-muted-foreground'
                  : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              {att.status === 'uploading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{att.fileName}</span>
              <span className="text-xs opacity-60 shrink-0">
                {att.status === 'uploading'
                  ? '처리 중...'
                  : att.status === 'error'
                  ? att.error || '오류'
                  : formatFileSize(att.fileSize)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(idx)}
                className="ml-1 hover:text-destructive transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[52px] w-[52px] shrink-0 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30"
          onClick={handleFileSelect}
          disabled={isLoading}
          title="파일 첨부"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.csv,.hwp,.doc,.docx"
          multiple
          onChange={handleFileChange}
        />
        <Textarea
          className="flex-1 min-h-[52px] max-h-[200px] resize-none rounded-lg px-5 py-3.5 bg-white dark:bg-background border-border focus-visible:ring-1 focus-visible:ring-ring"
          value={input}
          placeholder={
            activeAssistantName
              ? `${activeAssistantName}에게 메시지 보내기...`
              : 'Genie에게 메시지 보내기...'
          }
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <Button
          type="submit"
          disabled={!canSubmit}
          size="lg"
          className="rounded-lg px-6 h-[52px] shrink-0"
        >
          <SendHorizontal className="w-5 h-5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-2">
        Enter로 전송 · Shift+Enter로 줄바꿈 · 파일 드래그&드롭 또는 + 버튼으로 첨부
      </p>
    </form>
  );
}
