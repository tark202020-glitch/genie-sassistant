'use client';

import { PanelLeft, Bot, X, BarChart3, Users, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import type { Assistant } from '@/types';
import { APP_VERSION } from '@/lib/version';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeAssistant: Assistant | null;
  onDeactivateAssistant: () => void;
  userEmail?: string | null;
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  activeAssistant,
  onDeactivateAssistant,
  userEmail,
}: HeaderProps) {
  return (
    <header className="py-3 px-6 border-b border-border flex items-center gap-3">
      {!sidebarOpen && (
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
          <PanelLeft className="w-4 h-4" />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-serif font-normal text-foreground">Genie Assistant</h1>
          <span className="text-xs text-muted-foreground font-mono">{APP_VERSION}</span>
        </div>
        {activeAssistant ? (
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="bg-accent text-accent-foreground border-0">
              <Bot className="w-3 h-3 mr-1" />
              {activeAssistant.name}
            </Badge>
            <span className="text-xs text-muted-foreground">{activeAssistant.specialty}</span>
            <button
              onClick={onDeactivateAssistant}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            기본 모드 · 공유 학습자료 기반
          </p>
        )}
      </div>

      {userEmail && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{userEmail}</span>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <BarChart3 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href="/knowledge-graph" target="_blank" rel="noopener noreferrer">
              <BarChart3 className="w-4 h-4 mr-2" />
              지식 그래프
            </a>
          </DropdownMenuItem>
          {activeAssistant && (
            <DropdownMenuItem asChild>
              <a
                href={`/character-graph?assistantId=${activeAssistant.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Users className="w-4 h-4 mr-2" />
                캐릭터 관계도
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="로그아웃"
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }}
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </header>
  );
}
