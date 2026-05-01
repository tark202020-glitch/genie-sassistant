'use client';

import { useState } from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function ConversationList({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onDelete,
  onNewConversation,
}: ConversationListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmConv = conversations.find(c => c.id === confirmId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNewConversation}
          className="w-full h-9 text-sm"
        >
          <MessageSquarePlus className="w-4 h-4 mr-1.5" />
          새 대화
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="px-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">대화 기록이 없습니다.</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">새 대화를 시작해보세요</p>
          </div>
        ) : (
          <div className="px-2 space-y-0.5 w-full">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`px-2.5 py-2 rounded-md cursor-pointer group transition-all w-full ${
                  activeConversationId === conv.id
                    ? 'bg-primary/10 border-l-2 border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-1 w-full">
                  <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                    {conv.title}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(conv.id);
                    }}
                    className="text-red-400/60 hover:text-red-400 hover:bg-red-500/15 p-1 rounded transition-all shrink-0 flex-none"
                    title="대화 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(conv.updated_at)}
                  </span>
                  {conv.assistant_name && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-purple-500/15 text-purple-400 border-0">
                      <Bot className="w-2.5 h-2.5 mr-0.5" />
                      {conv.assistant_name}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <ConfirmDialog
        open={!!confirmId}
        onConfirm={() => {
          if (confirmId) onDelete(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
        title="⚠️ 대화 영구 삭제"
        description={`"${confirmConv?.title}" 대화와 모든 메시지가 완전히 삭제됩니다.\n\n삭제된 대화는 복구할 수 없습니다.\n정말 삭제하시겠습니까?`}
        confirmLabel="영구 삭제"
        variant="destructive"
      />
    </div>
  );
}
