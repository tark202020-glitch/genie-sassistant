'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Assistant, LearnedDocument, DocType, UploadStep } from '@/types';

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

export function useAssistants() {
  const assistantFileInputRef = useRef<HTMLInputElement>(null);

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPersona, setNewPersona] = useState('');
  const [creating, setCreating] = useState(false);

  const [assistantDocs, setAssistantDocs] = useState<LearnedDocument[]>([]);
  const [loadingAssistantDocs, setLoadingAssistantDocs] = useState(false);
  const [assistantFiles, setAssistantFiles] = useState<File[]>([]);
  const [assistantUploadStep, setAssistantUploadStep] = useState<UploadStep>('idle');
  const [assistantUploadMessage, setAssistantUploadMessage] = useState('');
  const [assistantDocType, setAssistantDocType] = useState<DocType>('script');

  const activeAssistant = assistants.find(a => a.id === activeAssistantId) || null;

  const fetchAssistants = useCallback(async () => {
    setLoadingAssistants(true);
    try {
      const res = await fetch('/api/assistants');
      const data = await res.json();
      if (data.assistants) setAssistants(data.assistants);
    } catch (e) {
      console.error('보조작가 목록 조회 실패:', e);
    } finally {
      setLoadingAssistants(false);
    }
  }, []);

  const fetchAssistantDocs = useCallback(async (assistantId: string) => {
    setLoadingAssistantDocs(true);
    try {
      const res = await fetch(`/api/assistants/${assistantId}/documents`);
      const data = await res.json();
      if (data.documents) setAssistantDocs(data.documents);
    } catch (e) {
      console.error('보조작가 문서 조회 실패:', e);
    } finally {
      setLoadingAssistantDocs(false);
    }
  }, []);

  const handleCreateAssistant = useCallback(async () => {
    if (!newName || !newSpecialty) return;
    setCreating(true);
    try {
      const res = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, specialty: newSpecialty, persona: newPersona || null }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName('');
        setNewSpecialty('');
        setNewPersona('');
        setShowCreateForm(false);
        toast.success(`"${newName}" 보조작가 생성 완료`);
        fetchAssistants();
      } else {
        toast.error(`생성 실패: ${data.error}`);
      }
    } catch {
      toast.error('보조작가 생성 중 오류 발생');
    } finally {
      setCreating(false);
    }
  }, [newName, newSpecialty, newPersona, fetchAssistants]);

  const handleUpdateResponseStyle = useCallback(async (assistantId: string, responseStyle: string | null) => {
    try {
      const res = await fetch('/api/assistants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assistantId, response_style: responseStyle }),
      });
      const data = await res.json();
      if (data.success) {
        setAssistants(prev => prev.map(a =>
          a.id === assistantId ? { ...a, response_style: responseStyle } : a
        ));
        toast.success('응답 스타일이 저장되었습니다.');
      } else {
        toast.error(`저장 실패: ${data.error}`);
      }
    } catch {
      toast.error('응답 스타일 저장 중 오류 발생');
    }
  }, []);

  const handleDeleteAssistant = useCallback(async (id: string, name: string) => {
    try {
      const res = await fetch('/api/assistants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        if (activeAssistantId === id) setActiveAssistantId(null);
        toast.success(`"${name}" 보조작가 삭제 완료`);
        fetchAssistants();
      } else {
        toast.error(`삭제 실패: ${data.error}`);
      }
    } catch {
      toast.error('보조작가 삭제 중 오류 발생');
    }
  }, [activeAssistantId, fetchAssistants]);

  // 3단계 파이프라인: (1) GCS+추출+청킹 → (2) 임베딩 배치 → (3) 요약
  const handleAssistantFileUpload = useCallback(async () => {
    if (assistantFiles.length === 0 || !activeAssistantId) return;
    const total = assistantFiles.length;
    const typeLabel = assistantDocType === 'reference' ? '참고자료' : '대본';
    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];
    let lastError = '';

    for (let i = 0; i < total; i++) {
      const currentFile = assistantFiles[i];
      try {
        // Step 1: GCS 업로드 + 텍스트 추출 + 청킹
        setAssistantUploadStep('uploading-gcs');
        setAssistantUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 업로드 중...`);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('docType', assistantDocType);
        const step1Res = await fetch(`/api/assistants/${activeAssistantId}/ingest`, { method: 'POST', body: formData });

        if (!step1Res.ok) {
          const errData = await step1Res.json().catch(() => null);
          throw new Error(errData?.error || `서버 오류 (${step1Res.status})`);
        }

        const step1Data = await step1Res.json();
        if (!step1Data.success) throw new Error(step1Data.error || '파일 처리 실패');

        // 텍스트 없는 파일 (이미지 PDF 등)
        if (step1Data.warning) {
          successCount++;
          continue;
        }

        const { chunks, fileName, assistantId, docType, gcsUri, assistantName, totalChunks, charCount } = step1Data;

        // Step 2: 임베딩 배치 처리
        setAssistantUploadStep('importing-ai');
        await processEmbeddingsInBatches(
          chunks,
          { fileName, assistantId, docType, gcsUri, assistantName },
          (done, chunkTotal) => {
            setAssistantUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 인덱싱 ${done}/${chunkTotal}`);
          }
        );

        // Step 3: 요약 생성 (실패해도 전체 실패로 처리하지 않음)
        setAssistantUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" 요약 생성 중...`);
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
      setAssistantUploadStep('complete');
      setAssistantUploadMessage(`${successCount}개 ${typeLabel} 학습 등록 완료!`);
      toast.success(`${successCount}개 ${typeLabel} 학습 등록 완료!`);
    } else {
      setAssistantUploadStep(successCount > 0 ? 'complete' : 'error');
      const detail = lastError ? ` — ${lastError}` : '';
      setAssistantUploadMessage(`${successCount}개 성공, ${failCount}개 실패 (${failedNames.join(', ')})${detail}`);
      toast.error(`${failCount}개 파일 업로드 실패: ${lastError || failedNames.join(', ')}`);
    }
    setAssistantFiles([]);
    if (assistantFileInputRef.current) assistantFileInputRef.current.value = '';
    fetchAssistantDocs(activeAssistantId);
    setTimeout(() => {
      setAssistantUploadStep('idle');
      setAssistantUploadMessage('');
    }, 8000);
  }, [assistantFiles, activeAssistantId, assistantDocType, fetchAssistantDocs]);

  const handleDeleteAssistantDoc = useCallback(async (doc: LearnedDocument) => {
    if (!activeAssistantId) return;
    try {
      const res = await fetch(`/api/assistants/${activeAssistantId}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: doc.source, gcsUri: doc.gcsUri, docName: doc.docName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${doc.source}" 삭제 완료`);
        fetchAssistantDocs(activeAssistantId);
      } else {
        toast.error(`삭제 실패: ${data.error}`);
      }
    } catch {
      toast.error('문서 삭제 중 오류 발생');
    }
  }, [activeAssistantId, fetchAssistantDocs]);

  const clearAssistantUploadState = useCallback(() => {
    setAssistantUploadStep('idle');
    setAssistantUploadMessage('');
  }, []);

  return {
    assistants,
    loadingAssistants,
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
    assistantDocs,
    setAssistantDocs,
    loadingAssistantDocs,
    assistantFiles,
    setAssistantFiles,
    assistantUploadStep,
    assistantUploadMessage,
    assistantDocType,
    setAssistantDocType,
    assistantFileInputRef,
    fetchAssistants,
    fetchAssistantDocs,
    handleCreateAssistant,
    handleUpdateResponseStyle,
    handleDeleteAssistant,
    handleAssistantFileUpload,
    handleDeleteAssistantDoc,
    clearAssistantUploadState,
  };
}
