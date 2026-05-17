'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { LearnedDocument, UploadStep } from '@/types';

const EMBED_BATCH_SIZE = 5;

async function processEmbeddingsInBatches(
  chunks: string[],
  meta: { fileName: string; assistantId: string | null; docType: string; gcsUri: string; assistantName: string | null },
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const total = chunks.length;
  for (let i = 0; i < total; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const res = await fetch('/api/embeddings/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: batch,
        fileName: meta.fileName,
        assistantId: meta.assistantId,
        docType: meta.docType,
        gcsUri: meta.gcsUri,
        assistantName: meta.assistantName,
        totalChunks: total,
        startIndex: i,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || `임베딩 처리 실패 (${res.status})`);
    }
    onProgress(Math.min(i + EMBED_BATCH_SIZE, total), total);
  }
}

async function generateSummary(
  meta: { fileName: string; assistantId: string | null; docType: string; gcsUri: string; charCount: number; chunkCount: number },
  textSample: string
): Promise<void> {
  await fetch('/api/documents/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...meta, textSample }),
  });
}

export function useDocuments() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [documents, setDocuments] = useState<LearnedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch (e) {
      console.error('문서 목록 조회 실패:', e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const handleDeleteDocument = useCallback(async (doc: LearnedDocument) => {
    setDeletingDocId(doc.id || doc.source);
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: doc.source, gcsUri: doc.gcsUri, docName: doc.docName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${doc.source}" 삭제 완료`);
        fetchDocuments();
      } else {
        toast.error(`삭제 실패: ${data.error}`);
      }
    } catch {
      toast.error('삭제 중 오류 발생');
    } finally {
      setDeletingDocId(null);
    }
  }, [fetchDocuments]);

  // 3단계 파이프라인: (1) GCS+추출+청킹 → (2) 임베딩 배치 → (3) 요약
  const handleFileUpload = useCallback(async () => {
    if (files.length === 0) return;
    const total = files.length;
    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];
    let lastError = '';

    for (let i = 0; i < total; i++) {
      const currentFile = files[i];
      try {
        // Step 1: GCS 업로드 + 텍스트 추출 + 청킹
        setUploadStep('uploading-gcs');
        setUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 업로드 중...`);

        const formData = new FormData();
        formData.append('file', currentFile);
        const step1Res = await fetch('/api/ingest', { method: 'POST', body: formData });

        if (!step1Res.ok) {
          const errData = await step1Res.json().catch(() => null);
          throw new Error(errData?.error || `서버 오류 (${step1Res.status})`);
        }

        const step1Data = await step1Res.json();
        if (!step1Data.success) throw new Error(step1Data.error || '파일 처리 실패');

        if (step1Data.warning) {
          successCount++;
          continue;
        }

        const { chunks, fileName, assistantId, docType, gcsUri, assistantName, totalChunks, charCount } = step1Data;

        // Step 2: 임베딩 배치 처리
        setUploadStep('importing-ai');
        await processEmbeddingsInBatches(
          chunks,
          { fileName, assistantId, docType, gcsUri, assistantName },
          (done, chunkTotal) => {
            setUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 인덱싱 ${done}/${chunkTotal}`);
          }
        );

        // Step 3: 요약 생성
        setUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 요약 생성 중...`);
        const textSample = chunks.slice(0, 30).join('\n');
        await generateSummary(
          { fileName, assistantId, docType, gcsUri, charCount, chunkCount: totalChunks },
          textSample
        ).catch((err: any) => console.warn('[Summary] 요약 생성 실패 (무시):', err.message));

        successCount++;
      } catch (err: any) {
        const errMsg = err.message || '알 수 없는 오류';
        console.error(`[Upload] "${currentFile.name}" 실패:`, errMsg);
        lastError = errMsg;
        failCount++;
        failedNames.push(currentFile.name);
      }
    }

    if (failCount === 0) {
      setUploadStep('complete');
      setUploadMessage(`${successCount}개 파일 학습 등록 완료!`);
      toast.success(`${successCount}개 파일 학습 등록 완료!`);
    } else {
      setUploadStep(successCount > 0 ? 'complete' : 'error');
      const detail = lastError ? ` — ${lastError}` : '';
      setUploadMessage(`${successCount}개 성공, ${failCount}개 실패 (${failedNames.join(', ')})${detail}`);
      toast.error(`${failCount}개 파일 업로드 실패: ${lastError || failedNames.join(', ')}`);
    }
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchDocuments();
    setTimeout(() => {
      setUploadStep('idle');
      setUploadMessage('');
    }, 8000);
  }, [files, fetchDocuments]);

  const clearUploadState = useCallback(() => {
    setUploadStep('idle');
    setUploadMessage('');
  }, []);

  return {
    documents,
    loadingDocs,
    files,
    setFiles,
    uploadStep,
    uploadMessage,
    deletingDocId,
    fileInputRef,
    fetchDocuments,
    handleFileUpload,
    handleDeleteDocument,
    clearUploadState,
  };
}
