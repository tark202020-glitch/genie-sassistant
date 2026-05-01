'use client';

import { type FormEvent } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import type { Message } from 'ai';
import type { Assistant } from '@/types';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  activeAssistant: Assistant | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function ChatArea({
  messages,
  input,
  isLoading,
  activeAssistant,
  onInputChange,
  onSubmit,
}: ChatAreaProps) {
  const { messagesEndRef } = useChatScroll(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ScrollArea className="flex-1">
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
        onInputChange={onInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
