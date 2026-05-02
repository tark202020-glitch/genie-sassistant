'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { AssistantSelector } from '@/components/sidebar/AssistantSelector';
import { ConversationList } from '@/components/sidebar/ConversationList';
import { DocumentsSection } from '@/components/sidebar/DocumentsSection';
import { useDocuments } from '@/hooks/use-documents';
import { useAssistants } from '@/hooks/use-assistants';
import { useConversations } from '@/hooks/use-conversations';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  documents: ReturnType<typeof useDocuments>;
  assistantsHook: ReturnType<typeof useAssistants>;
  conversationsHook: ReturnType<typeof useConversations>;
  onLoadConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function Sidebar({
  open,
  onClose,
  documents,
  assistantsHook,
  conversationsHook,
  onLoadConversation,
  onNewConversation,
}: SidebarProps) {
  const [savedGraphs, setSavedGraphs] = useState<{ id: string; name: string; updated_at: string }[]>([]);

  const fetchSavedGraphs = useCallback(async () => {
    if (!assistantsHook.activeAssistantId) {
      setSavedGraphs([]);
      return;
    }
    try {
      const res = await fetch(`/api/character-graphs?assistantId=${assistantsHook.activeAssistantId}`);
      const data = await res.json();
      if (data.graphs) setSavedGraphs(data.graphs);
    } catch {
      // 무시
    }
  }, [assistantsHook.activeAssistantId]);

  useEffect(() => {
    fetchSavedGraphs();
  }, [fetchSavedGraphs]);

  return (
    <aside
      className={`${
        open ? 'w-80' : 'w-0'
      } transition-all duration-300 overflow-hidden border-r border-border flex-shrink-0`}
    >
      <div className="w-80 h-full flex flex-col bg-card overflow-hidden">
        {/* 닫기 버튼 */}
        <div className="flex justify-end p-1.5 border-b border-border">
          <button
            onClick={onClose}
            className="px-1.5 py-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 보조작가 선택 */}
        <AssistantSelector
          assistantsHook={assistantsHook}
          savedGraphs={savedGraphs}
        />

        {/* 2. 대화 목록 (메인 영역) */}
        <ConversationList
          conversations={conversationsHook.conversations}
          activeConversationId={conversationsHook.activeConversationId}
          loading={conversationsHook.loadingConversations}
          onSelect={onLoadConversation}
          onDelete={conversationsHook.deleteConversation}
          onNewConversation={onNewConversation}
        />

        {/* 3. 학습자료 관리 (접힌 섹션 — flex-shrink-0으로 충분한 공간 확보) */}
        <div className="flex-shrink-0 max-h-[50%] flex flex-col overflow-hidden">
          <DocumentsSection
            documents={documents}
            assistantsHook={assistantsHook}
          />
        </div>
      </div>
    </aside>
  );
}
