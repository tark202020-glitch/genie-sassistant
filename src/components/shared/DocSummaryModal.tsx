'use client';

import { useState, useEffect } from 'react';
import { FileText, Scroll, BookOpen, Loader2, FileWarning } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LearnedDocument } from '@/types';

interface DocSummaryModalProps {
  doc: LearnedDocument | null;
  assistantId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function DocSummaryModal({ doc, assistantId, open, onClose }: DocSummaryModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ charCount?: number; chunkCount?: number } | null>(null);

  useEffect(() => {
    if (!open || !doc) {
      setSummary(null);
      setMeta(null);
      return;
    }

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ source_file: doc.source });
        if (assistantId) params.set('assistant_id', assistantId);
        const res = await fetch(`/api/documents/summary?${params}`);
        const data = await res.json();
        setSummary(data.summary || null);
        if (data.charCount) {
          setMeta({ charCount: data.charCount, chunkCount: data.chunkCount });
        }
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [open, doc, assistantId]);

  const Icon = doc?.docType === 'reference' ? BookOpen : doc?.docType === 'script' ? Scroll : FileText;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{doc?.source}</span>
          </DialogTitle>
          {meta && (
            <DialogDescription className="text-xs">
              {meta.charCount ? `${meta.charCount.toLocaleString()}자` : ''}
              {meta.chunkCount ? ` · ${meta.chunkCount}개 청크` : ''}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">요약 불러오는 중...</p>
            </div>
          ) : summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none py-2 text-sm leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <FileWarning className="w-8 h-8" />
              <p className="text-sm text-center">
                이 문서의 요약이 아직 생성되지 않았습니다.
                <br />
                <span className="text-xs">문서를 다시 업로드하면 요약이 자동 생성됩니다.</span>
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
