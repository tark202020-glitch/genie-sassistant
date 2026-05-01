'use client';

import { useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useDocuments } from '@/hooks/use-documents';
import { useAssistants } from '@/hooks/use-assistants';
import type { SidebarTab } from '@/types';

export default function Home() {
  const documents = useDocuments();
  const assistantsHook = useAssistants();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { assistantId: assistantsHook.activeAssistantId },
  });

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('shared');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    documents.fetchDocuments();
  }, [documents.fetchDocuments]);

  useEffect(() => {
    assistantsHook.fetchAssistants();
  }, [assistantsHook.fetchAssistants]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        assistantsHook={assistantsHook}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          activeAssistant={assistantsHook.activeAssistant}
          onDeactivateAssistant={() => assistantsHook.setActiveAssistantId(null)}
        />
        <ChatArea
          messages={messages}
          input={input}
          isLoading={isLoading}
          activeAssistant={assistantsHook.activeAssistant}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}
