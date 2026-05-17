'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Users, MapPin, FileText } from 'lucide-react';
import { CharacterTab } from '@/components/script-organizer/CharacterTab';
import { SettingDiagramTab } from '@/components/script-organizer/SettingDiagramTab';
import { EpisodeSummaryTab } from '@/components/script-organizer/EpisodeSummaryTab';

type TabType = 'characters' | 'settings' | 'episodes';

function ScriptOrganizerContent() {
  const searchParams = useSearchParams();
  const assistantId = searchParams.get('assistantId');
  const [activeTab, setActiveTab] = useState<TabType>('characters');

  if (!assistantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center bg-destructive/10 border border-destructive/20 rounded-xl p-8 max-w-md">
          <p className="text-destructive text-lg font-medium mb-2">보조작가 미선택</p>
          <p className="text-destructive/70">메인 페이지에서 보조작가를 활성화한 후 이 페이지를 열어주세요.</p>
          <a href="/" className="inline-block mt-4 text-ring hover:text-ring/80 underline">
            ← 메인으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'characters', label: '캐릭터 분석', icon: <Users className="w-4 h-4" /> },
    { key: 'settings', label: '배경 정리', icon: <MapPin className="w-4 h-4" /> },
    { key: 'episodes', label: '화별 요약', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background/90 backdrop-blur-md z-10">
        <a
          href="/"
          className="text-muted-foreground hover:text-foreground transition text-sm flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 돌아가기
        </a>
        <h1 className="text-xl font-bold text-ring">
          📖 대본 정리
        </h1>
      </header>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-secondary text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'characters' && <CharacterTab assistantId={assistantId} />}
        {activeTab === 'settings' && <SettingDiagramTab assistantId={assistantId} />}
        {activeTab === 'episodes' && <EpisodeSummaryTab assistantId={assistantId} />}
      </div>
    </div>
  );
}

export default function ScriptOrganizerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-ring animate-spin" />
        </div>
      }
    >
      <ScriptOrganizerContent />
    </Suspense>
  );
}
