'use client';

import { PanelLeft, Bot, X, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import type { Assistant } from '@/types';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeAssistant: Assistant | null;
  onDeactivateAssistant: () => void;
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  activeAssistant,
  onDeactivateAssistant,
}: HeaderProps) {
  return (
    <header className="py-3 px-6 border-b border-border flex items-center gap-3">
      {!sidebarOpen && (
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8">
          <PanelLeft className="w-4 h-4" />
        </Button>
      )}
      <div className="flex-1">
        <h1 className="text-xl font-bold text-foreground">Genie Assistant</h1>
        {activeAssistant ? (
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-0">
              <Bot className="w-3 h-3 mr-1" />
              {activeAssistant.name}
            </Badge>
            <span className="text-xs text-muted-foreground">{activeAssistant.specialty}</span>
            <button
              onClick={onDeactivateAssistant}
              className="text-muted-foreground hover:text-red-400 transition-colors"
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
    </header>
  );
}
