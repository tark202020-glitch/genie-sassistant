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

export default function Home() {
  const documents = useDocuments();
  const assistantsHook = useAssistants();
  const conversationsHook = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUserEmail(data.user.username); })
      .catch(() => {});
  }, []);

  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { assistantId: assistantsHook.activeAssistantId },
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

  const handleChatSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let convId = conversationsHook.activeConversationId;

    if (!convId && !creatingRef.current) {
      creatingRef.current = true;
      const autoTitle = input.trim().slice(0, 30) + (input.trim().length > 30 ? '...' : '');
      convId = await conversationsHook.createConversation(
        assistantsHook.activeAssistantId,
        autoTitle,
      );
      creatingRef.current = false;
    }

    if (convId) {
      activeConvRef.current = convId;
      conversationsHook.saveMessage(convId, 'user', input.trim());
    }

    handleSubmit(e);
  }, [input, isLoading, conversationsHook, assistantsHook.activeAssistantId, handleSubmit]);

  const handleLoadConversation = useCallback(async (id: string) => {
    const msgs = await conversationsHook.loadConversation(id);
    setMessages(msgs);
  }, [conversationsHook, setMessages]);

  const handleNewConversation = useCallback(() => {
    conversationsHook.startNewConversation();
    setMessages([]);
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
          onInputChange={handleInputChange}
          onSubmit={handleChatSubmit}
        />
      </main>
    </div>
  );
}
