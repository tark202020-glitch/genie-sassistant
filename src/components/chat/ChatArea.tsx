'use client';

import { type FormEvent, type DragEvent, useCallback, useState } from 'react';
import { Bot, Loader2, Sparkles, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { ChatInput, type ChatAttachment } from './ChatInput';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import type { Message } from 'ai';
import type { Assistant } from '@/types';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  activeAssistant: Assistant | null;
  attachments: ChatAttachment[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onAttachFiles: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
}

export function ChatArea({
  messages,
  input,
  isLoading,
  activeAssistant,
  attachments,
  onInputChange,
  onSubmit,
  onAttachFiles,
  onRemoveAttachment,
}: ChatAreaProps) {
  const { messagesEndRef } = useChatScroll(messages);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onAttachFiles(files);
    }
  }, [onAttachFiles]);

  return (
    <div
      className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-2">
          <div className="flex flex-col items-center gap-2 text-primary">
            <FileText className="w-12 h-12" />
            <p className="text-lg font-medium">파일을 여기에 놓으세요</p>
            <p className="text-sm text-muted-foreground">PDF, TXT, MD, CSV 파일 지원</p>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="py-4 px-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {activeAssistant
                  ? `${activeAssistant.name}에게 질문해보세요!`
                  : '시나리오, 드라마 대본 작성, 무엇이든 물어보세요!'}
              </p>
              <p className="text-sm mt-2 opacity-70">
                {activeAssistant
                  ? `전문 분야: ${activeAssistant.specialty}`
                  : '"주인공의 결핍을 어떻게 설정하면 좋을까?"'}
              </p>
              <p className="text-xs mt-4 opacity-50">
                파일을 드래그하거나 + 버튼으로 첨부할 수 있습니다
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                activeAssistantName={activeAssistant?.name}
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-xl bg-muted text-muted-foreground rounded-tl-none border border-border">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {activeAssistant ? `${activeAssistant.name}이(가)` : '블랙위도우가'} 답변을
                  작성 중입니다...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <ChatInput
        input={input}
        isLoading={isLoading}
        activeAssistantName={activeAssistant?.name}
        attachments={attachments}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onAttachFiles={onAttachFiles}
        onRemoveAttachment={onRemoveAttachment}
      />
    </div>
  );
}
