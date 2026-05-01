'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Assistant, LearnedDocument, DocType, UploadStep } from '@/types';

export function useAssistants() {
  const assistantFileInputRef = useRef<HTMLInputElement>(null);

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);

  // 생성 폼
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPersona, setNewPersona] = useState('');
  const [creating, setCreating] = useState(false);

  // 어시스턴트 문서
  const [assistantDocs, setAssistantDocs] = useState<LearnedDocument[]>([]);
  const [loadingAssistantDocs, setLoadingAssistantDocs] = useState(false);
  const [assistantFiles, setAssistantFiles] = useState<File[]>([]);
  const [assistantUploadStep, setAssistantUploadStep] = useState<UploadStep>('idle');
  const [assistantUploadMessage, setAssistantUploadMessage] = useState('');
  const [assistantDocType, setAssistantDocType] = useState<DocType>('script');

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
        if (selectedAssistant?.id === id) setSelectedAssistant(null);
        toast.success(`"${name}" 보조작가 삭제 완료`);
        fetchAssistants();
      } else {
        toast.error(`삭제 실패: ${data.error}`);
      }
    } catch {
      toast.error('보조작가 삭제 중 오류 발생');
    }
  }, [activeAssistantId, selectedAssistant, fetchAssistants]);

  const handleAssistantFileUpload = useCallback(async () => {
    if (assistantFiles.length === 0 || !selectedAssistant) return;
    const total = assistantFiles.length;
    const typeLabel = assistantDocType === 'reference' ? '참고자료' : '대본';
    let successCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];

    for (let i = 0; i < total; i++) {
      const currentFile = assistantFiles[i];
      setAssistantUploadStep('uploading-gcs');
      setAssistantUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" ${typeLabel} GCS에 업로드 중...`);
      try {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('docType', assistantDocType);
        const res = await fetch(`/api/assistants/${selectedAssistant.id}/ingest`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          setAssistantUploadStep('importing-ai');
          setAssistantUploadMessage(`(${i + 1}/${total}) "${currentFile.name}" ${typeLabel} 인덱싱 중...`);
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
      setAssistantUploadStep('complete');
      setAssistantUploadMessage(`${successCount}개 ${typeLabel} 학습 등록 완료!`);
      toast.success(`${successCount}개 ${typeLabel} 학습 등록 완료!`);
    } else {
      setAssistantUploadStep(successCount > 0 ? 'complete' : 'error');
      setAssistantUploadMessage(`${successCount}개 성공, ${failCount}개 실패 (${failedNames.join(', ')})`);
      toast.error(`${failCount}개 파일 업로드 실패`);
    }
    setAssistantFiles([]);
    if (assistantFileInputRef.current) assistantFileInputRef.current.value = '';
    fetchAssistantDocs(selectedAssistant.id);
    setTimeout(() => {
      setAssistantUploadStep('idle');
      setAssistantUploadMessage('');
    }, 5000);
  }, [assistantFiles, selectedAssistant, assistantDocType, fetchAssistantDocs]);

  const handleDeleteAssistantDoc = useCallback(async (doc: LearnedDocument) => {
    if (!selectedAssistant) return;
    try {
      const res = await fetch(`/api/assistants/${selectedAssistant.id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: doc.source, gcsUri: doc.gcsUri, docName: doc.docName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${doc.source}" 삭제 완료`);
        fetchAssistantDocs(selectedAssistant.id);
      } else {
        toast.error(`삭제 실패: ${data.error}`);
      }
    } catch {
      toast.error('문서 삭제 중 오류 발생');
    }
  }, [selectedAssistant, fetchAssistantDocs]);

  const clearAssistantUploadState = useCallback(() => {
    setAssistantUploadStep('idle');
    setAssistantUploadMessage('');
  }, []);

  const activeAssistant = assistants.find(a => a.id === activeAssistantId) || null;

  return {
    assistants,
    loadingAssistants,
    selectedAssistant,
    setSelectedAssistant,
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
    handleDeleteAssistant,
    handleAssistantFileUpload,
    handleDeleteAssistantDoc,
    clearAssistantUploadState,
  };
}
