'use client';

import { useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  activeAssistantName?: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function ChatInput({
  input,
  isLoading,
  activeAssistantName,
  onInputChange,
  onSubmit,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          formRef.current?.requestSubmit();
        }
      }
    },
    [input, isLoading]
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="px-6 py-4 border-t border-border">
      <div className="flex gap-2 items-end">
        <Textarea
          className="flex-1 min-h-[52px] max-h-[200px] resize-none rounded-2xl px-5 py-3.5 bg-background border-border focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
          value={input}
          placeholder={
            activeAssistantName
              ? `${activeAssistantName}에게 메시지 보내기...`
              : 'Genie에게 메시지 보내기...'
          }
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          size="lg"
          className="rounded-2xl px-6 h-[52px] shrink-0"
        >
          <SendHorizontal className="w-5 h-5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-2">
        Enter로 전송 · Shift+Enter로 줄바꿈
      </p>
    </form>
  );
}
