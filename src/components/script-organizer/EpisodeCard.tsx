'use client';

import { Users, MapPin, Heart, Zap } from 'lucide-react';
import type { EpisodeSummary } from '@/types/script-organizer';
import { EMOTION_COLORS } from '@/types/script-organizer';

interface EpisodeCardProps {
  summary: EpisodeSummary;
}

export function EpisodeCard({ summary }: EpisodeCardProps) {
  const toneColor = EMOTION_COLORS[summary.emotionalTone] || '#94a3b8';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-ring/30 transition-colors">
      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-foreground/90">{summary.episode}</span>
          <div>
            <p className="text-xs text-muted-foreground/60">EPISODE</p>
            <p className="text-xs text-muted-foreground/50 truncate max-w-[200px]" title={summary.fileName}>
              {summary.fileName}
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: `${toneColor}20`, color: toneColor, border: `1px solid ${toneColor}40` }}
        >
          {summary.emotionalTone}
        </span>
      </div>

      {/* 줄거리 */}
      <div className="px-5 py-3">
        <p className="text-sm text-foreground/70 leading-relaxed">{summary.plotSummary}</p>
      </div>

      {/* 감정 흐름 */}
      {summary.emotionalArc && (
        <div className="px-5 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Heart className="w-3 h-3 text-pink-400 shrink-0" />
            <p className="text-xs text-muted-foreground/70">{summary.emotionalArc}</p>
          </div>
        </div>
      )}

      {/* 핵심 사건 */}
      {summary.keyEvents.length > 0 && (
        <div className="px-5 py-2 border-t border-border">
          <div className="flex items-start gap-2">
            <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {summary.keyEvents.map((event, i) => (
                <p key={i} className="text-xs text-muted-foreground/70">
                  {event}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 + 장소 배지 */}
      <div className="px-5 py-3 border-t border-border space-y-2">
        {summary.keyCharacters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Users className="w-3 h-3 text-rose-400 shrink-0" />
            {summary.keyCharacters.map((char) => (
              <span key={char} className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {char}
              </span>
            ))}
          </div>
        )}
        {summary.keyLocations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
            {summary.keyLocations.map((loc) => (
              <span key={loc} className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {loc}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
