'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { LearnedDocument, UploadStep } from '@/types';

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

  const handleFileUpload = useCallback(async () => {
    if (files.length === 0) return;
    const total = files.length;
    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];

    for (let i = 0; i < total; i++) {
      const currentFile = files[i];
      setUploadStep('uploading-gcs');
      setUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" GCS에 업로드 중...`);
      try {
        const formData = new FormData();
        formData.append('file', currentFile);
        const res = await fetch('/api/ingest', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          setUploadStep('importing-ai');
          setUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 인덱싱 중...`);
          successCount++;
        } else {
          failCount++;
          failedNames.push(currentFile.name);
        }
      } catch {
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
      setUploadMessage(`${successCount}개 성공, ${failCount}개 실패 (${failedNames.join(', ')})`);
      toast.error(`${failCount}개 파일 업로드 실패`);
    }
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchDocuments();
    setTimeout(() => {
      setUploadStep('idle');
      setUploadMessage('');
    }, 5000);
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
