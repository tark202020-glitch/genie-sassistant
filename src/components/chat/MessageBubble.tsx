'use client';

import { User, Bot, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from 'ai';

interface MessageBubbleProps {
  message: Message;
  activeAssistantName?: string | null;
}

function extractAttachmentNames(content: string): { displayContent: string; fileNames: string[] } {
  const marker = '\n\n---\n[첨부 파일: ';
  const idx = content.indexOf(marker);
  if (idx === -1) return { displayContent: content, fileNames: [] };

  const displayContent = content.substring(0, idx);
  const attachPart = content.substring(idx + marker.length);
  const closingIdx = attachPart.indexOf(']');
  if (closingIdx === -1) return { displayContent: content, fileNames: [] };

  const namesStr = attachPart.substring(0, closingIdx);
  const fileNames = namesStr.split(', ').filter(Boolean);
  return { displayContent, fileNames };
}

export function MessageBubble({ message, activeAssistantName }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { displayContent, fileNames } = isUser
    ? extractAttachmentNames(message.content)
    : { displayContent: message.content, fileNames: [] };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-4 rounded-xl ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted text-foreground rounded-tl-none border border-border'
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
        {fileNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {fileNames.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/20 border border-white/20"
              >
                <FileText className="w-3 h-3" />
                {name}
              </span>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed break-words">{displayContent}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
