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
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">보조작가 미선택</p>
          <p className="text-red-300/70">메인 페이지에서 보조작가를 활성화한 후 이 페이지를 열어주세요.</p>
          <a href="/" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 underline">
            ← 메인으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'characters', label: '캐릭터 관계도', icon: <Users className="w-4 h-4" /> },
    { key: 'settings', label: '배경 정리', icon: <MapPin className="w-4 h-4" /> },
    { key: 'episodes', label: '화별 요약', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-[#0a0a1a]/90 backdrop-blur-md z-10">
        <a
          href="/"
          className="text-white/50 hover:text-white/80 transition text-sm flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 돌아가기
        </a>
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          📖 대본 정리
        </h1>
      </header>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/5 bg-[#0a0a1a]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent'
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
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      }
    >
      <ScriptOrganizerContent />
    </Suspense>
  );
}
