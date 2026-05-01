'use client';

import { useState, useCallback } from 'react';
import type { Message } from 'ai';
import type { Conversation } from '@/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {
      // 무시
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const createConversation = useCallback(async (assistantId?: string | null, title?: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: assistantId || null, title }),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveConversationId(data.conversation.id);
        setConversations(prev => [data.conversation, ...prev]);
        return data.conversation.id;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const loadConversation = useCallback(async (id: string): Promise<Message[]> => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setActiveConversationId(id);
        return data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as Message['role'],
          content: m.content,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (id === activeConversationId) {
        setActiveConversationId(null);
      }
    } catch {
      // 무시
    }
  }, [activeConversationId]);

  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch {
      // fire-and-forget
    }
  }, []);

  const updateTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title } : c)
      );
    } catch {
      // 무시
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loadingConversations,
    fetchConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    saveMessage,
    updateTitle,
    startNewConversation,
  };
}
