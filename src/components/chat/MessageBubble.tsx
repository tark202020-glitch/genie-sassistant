'use client';

import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from 'ai';

interface MessageBubbleProps {
  message: Message;
  activeAssistantName?: string | null;
}

export function MessageBubble({ message, activeAssistantName }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-4 rounded-xl ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted text-muted-foreground rounded-tl-none border border-border'
        }`}
      >
        <span className="font-semibold text-xs flex items-center gap-1 mb-1 opacity-70">
          {isUser ? (
            <>
              <User className="w-3 h-3" />
              작가님
            </>
          ) : (
            <>
              <Bot className="w-3 h-3" />
              {activeAssistantName || '블랙위도우 보조작가'}
            </>
          )}
        </span>
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
