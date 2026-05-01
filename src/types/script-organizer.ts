// === 배경/공간 다이어그램 ===
export interface SettingNode {
  id: string;
  label: string;
  type: 'indoor' | 'outdoor' | 'vehicle' | 'virtual' | 'other';
  description: string;
  episodes: number[];
  frequency: number;
  color: string;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SettingEdge {
  source: string;
  target: string;
  relationship: string;
  description: string;
  color: string;
}

export interface SettingGraphData {
  nodes: SettingNode[];
  edges: SettingEdge[];
  stats: { totalLocations: number; totalRelationships: number; analyzedScripts: number };
}

// === 화별 요약 ===
export interface EpisodeSummary {
  episode: number;
  fileName: string;
  plotSummary: string;
  keyCharacters: string[];
  keyLocations: string[];
  emotionalTone: string;
  emotionalArc: string;
  keyEvents: string[];
}

// === 저장된 분석 ===
export interface ScriptAnalysis {
  id: string;
  assistant_id: string;
  name: string;
  analysis_type: 'settings' | 'episodes';
  data: SettingGraphData | EpisodeSummary[];
  created_at: string;
  updated_at: string;
}

// 색상 상수
export const SETTING_TYPE_COLORS: Record<string, string> = {
  indoor: '#6366f1',
  outdoor: '#22c55e',
  vehicle: '#f97316',
  virtual: '#8b5cf6',
  other: '#94a3b8',
};

export const SETTING_TYPE_LABELS: Record<string, string> = {
  indoor: '실내',
  outdoor: '실외',
  vehicle: '차량/이동',
  virtual: '가상',
  other: '기타',
};

export const SETTING_RELATION_COLORS: Record<string, string> = {
  contains: '#3b82f6',
  adjacent: '#22c55e',
  connected: '#f97316',
  part_of: '#8b5cf6',
  opposite: '#ef4444',
};

export const SETTING_RELATION_LABELS: Record<string, string> = {
  contains: '포함',
  adjacent: '인접',
  connected: '연결',
  part_of: '소속',
  opposite: '대비',
};

export const EMOTION_COLORS: Record<string, string> = {
  '긴장감': '#ef4444',
  '감동': '#3b82f6',
  '코미디': '#f59e0b',
  '로맨스': '#ec4899',
  '공포': '#6b21a8',
  '액션': '#f97316',
  '슬픔': '#6366f1',
  '희망': '#22c55e',
  '분노': '#dc2626',
  '미스터리': '#8b5cf6',
};
