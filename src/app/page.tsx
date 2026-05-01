'use client';

import { useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useChat } from 'ai/react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useDocuments } from '@/hooks/use-documents';
import { useAssistants } from '@/hooks/use-assistants';
import { useConversations } from '@/hooks/use-conversations';
import { useState } from 'react';
import type { ChatAttachment } from '@/components/chat/ChatInput';

export default function Home() {
  const documents = useDocuments();
  const assistantsHook = useAssistants();
  const conversationsHook = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const attachmentsRef = useRef<ChatAttachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUserEmail(data.user.username); })
      .catch(() => {});
  }, []);

  const { messages, setMessages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    body: {
      assistantId: assistantsHook.activeAssistantId,
    },
    onFinish: async (message) => {
      const convId = activeConvRef.current;
      if (convId) {
        await conversationsHook.saveMessage(convId, 'assistant', message.content);
        conversationsHook.fetchConversations();
      }
    },
  });

  const activeConvRef = useRef(conversationsHook.activeConversationId);
  useEffect(() => {
    activeConvRef.current = conversationsHook.activeConversationId;
  }, [conversationsHook.activeConversationId]);

  const creatingRef = useRef(false);

  const handleAttachFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const idx = attachmentsRef.current.length;
      const newAtt: ChatAttachment = {
        fileName: file.name,
        fileSize: file.size,
        text: '',
        status: 'uploading',
      };
      setAttachments(prev => [...prev, newAtt]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/chat-upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setAttachments(prev =>
            prev.map((a, i) => i === idx ? { ...a, status: 'error' as const, error: data.error } : a)
          );
        } else {
          setAttachments(prev =>
            prev.map((a, i) => i === idx ? { ...a, status: 'ready' as const, text: data.text, fileSize: data.fileSize } : a)
          );
        }
      } catch {
        setAttachments(prev =>
          prev.map((a, i) => i === idx ? { ...a, status: 'error' as const, error: '업로드 실패' } : a)
        );
      }
    }
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleChatSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const readyAttachments = attachmentsRef.current.filter(a => a.status === 'ready');
    if (!input.trim() && readyAttachments.length === 0) return;
    if (isLoading) return;

    let convId = conversationsHook.activeConversationId;

    if (!convId && !creatingRef.current) {
      creatingRef.current = true;
      const autoTitle = input.trim().slice(0, 30) + (input.trim().length > 30 ? '...' : '');
      convId = await conversationsHook.createConversation(
        assistantsHook.activeAssistantId,
        autoTitle || (readyAttachments[0]?.fileName || '새 대화'),
      );
      creatingRef.current = false;
    }

    let finalMessage = input.trim();

    if (readyAttachments.length > 0) {
      const fileTexts = readyAttachments
        .map(a => `--- 첨부 파일: ${a.fileName} ---\n${a.text}`)
        .join('\n\n');
      const fileNames = readyAttachments.map(a => a.fileName).join(', ');

      if (finalMessage) {
        finalMessage = `${finalMessage}\n\n---\n[첨부 파일: ${fileNames}]\n\n${fileTexts}`;
      } else {
        finalMessage = `[첨부 파일: ${fileNames}]\n이 파일의 내용을 분석해주세요.\n\n${fileTexts}`;
      }
    }

    if (convId) {
      activeConvRef.current = convId;
      conversationsHook.saveMessage(convId, 'user', finalMessage);
    }

    setAttachments([]);
    setInput(finalMessage);

    // useChat의 handleSubmit을 트리거하기 위해 setTimeout 사용
    setTimeout(() => {
      handleSubmit(e);
    }, 0);
  }, [input, isLoading, conversationsHook, assistantsHook.activeAssistantId, handleSubmit, setInput]);

  const handleLoadConversation = useCallback(async (id: string) => {
    const msgs = await conversationsHook.loadConversation(id);
    setMessages(msgs);
    setAttachments([]);
  }, [conversationsHook, setMessages]);

  const handleNewConversation = useCallback(() => {
    conversationsHook.startNewConversation();
    setMessages([]);
    setAttachments([]);
  }, [conversationsHook, setMessages]);

  // 보조작가 전환 시 전용 문서 로드
  useEffect(() => {
    if (assistantsHook.activeAssistantId) {
      assistantsHook.fetchAssistantDocs(assistantsHook.activeAssistantId);
    }
  }, [assistantsHook.activeAssistantId, assistantsHook.fetchAssistantDocs]);

  useEffect(() => {
    documents.fetchDocuments();
  }, [documents.fetchDocuments]);

  useEffect(() => {
    assistantsHook.fetchAssistants();
  }, [assistantsHook.fetchAssistants]);

  useEffect(() => {
    conversationsHook.fetchConversations();
  }, [conversationsHook.fetchConversations]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        assistantsHook={assistantsHook}
        conversationsHook={conversationsHook}
        onLoadConversation={handleLoadConversation}
        onNewConversation={handleNewConversation}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          activeAssistant={assistantsHook.activeAssistant}
          onDeactivateAssistant={() => assistantsHook.setActiveAssistantId(null)}
          userEmail={userEmail}
        />
        <ChatArea
          messages={messages}
          input={input}
          isLoading={isLoading}
          activeAssistant={assistantsHook.activeAssistant}
          attachments={attachments}
          onInputChange={handleInputChange}
          onSubmit={handleChatSubmit}
          onAttachFiles={handleAttachFiles}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </main>
    </div>
  );
}
