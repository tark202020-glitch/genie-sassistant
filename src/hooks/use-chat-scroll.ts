'use client';

import { useEffect, useRef } from 'react';
import type { Message } from 'ai';

export function useChatScroll(messages: Message[]) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return { messagesEndRef };
}
