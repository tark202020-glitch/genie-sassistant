'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Manuscript {
  id: string;
  title: string;
  part_label: string | null;
  char_count: number;
  author_context: string | null;
}

const STEP_LABEL: Record<string, string> = {
  '0.5': '시놉시스 대조',
  '1': '구조화',
  '2': '문체',
  '3': '장점',
  '4': '결함 탐지',
  '5': '물음표',
  '6': '방향',
};

export default function NewRunPage() {
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [manuscriptId, setManuscriptId] = useState('');
  const [mode, setMode] = useState<'I' | 'D' | 'R' | 'F'>('D');
  const [model, setModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [synopsis, setSynopsis] = useState('');
  const [error, setError] = useState('');

  // 새 원고 업로드
  const [newTitle, setNewTitle] = useState('');
  const [newPart, setNewPart] = useState('');
  const [newCtx, setNewCtx] = useState('');

  // 선택된 원고의 작가 컨텍스트 편집
  const [ctxDraft, setCtxDraft] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 실행 진행
  const [runId, setRunId] = useState<string | null>(null);
  const [stepsPlan, setStepsPlan] = useState<string[]>([]);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const loadManuscripts = () =>
    fetch('/api/lab/manuscripts')
      .then((r) => r.json())
      .then((d) => setManuscripts(d.manuscripts ?? []));

  useEffect(() => {
    loadManuscripts();
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !newTitle.trim()) {
      setError('원고 제목과 파일(.pdf/.txt/.md)이 필요합니다.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle);
      if (newPart) formData.append('part_label', newPart);
      if (newCtx.trim()) formData.append('author_context', newCtx);
      formData.append('file', file);
      const res = await fetch('/api/lab/manuscripts', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTitle('');
      setNewPart('');
      setNewCtx('');
      if (fileRef.current) fileRef.current.value = '';
      await loadManuscripts();
      setManuscriptId(data.id);
    } catch (e: any) {
      setError(e.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleStart = async () => {
    if (!manuscriptId) {
      setError('원고를 선택하세요.');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/lab/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscript_id: manuscriptId, mode, model, synopsis: synopsis || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRunId(data.id);
      setStepsPlan(data.steps);
      // advance 루프 — 한 호출 = 한 단계. 브라우저를 닫아도 상세 화면에서 이어 실행 가능
      let done = false;
      while (!done) {
        const ares = await fetch(`/api/lab/runs/${data.id}/advance`, { method: 'POST' });
        let adv: any = null;
        try {
          adv = await ares.json();
        } catch {
          adv = null;
        }
        if (!ares.ok || !adv) {
          if ([502, 504, 524].includes(ares.status) || !adv) {
            throw new Error(
              '⏱ 서버 처리 시간 한도(300초)를 초과한 것으로 보입니다. 실행은 저장되어 있으니 아래 [실행 상세로 이동] 후 [이어서 실행]을 누르면 중단 지점부터 재개됩니다.'
            );
          }
          throw new Error(adv?.error || `실행 실패 (HTTP ${ares.status})`);
        }
        if (adv.error) throw new Error(`[단계 ${adv.step ?? '?'}] ${adv.error}`);
        if (adv.step) {
          setCurrentStep(adv.step);
          setDoneSteps((prev) => [...prev, adv.step]);
        }
        done = adv.done;
      }
      router.push(`/lab/runs/${data.id}`);
    } catch (e: any) {
      setError(e.message || '실행 실패');
    }
  };

  const running = runId !== null;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">새 실행</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 원고 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={manuscriptId}
            onChange={(e) => {
              setManuscriptId(e.target.value);
              const m = manuscripts.find((x) => x.id === e.target.value);
              setCtxDraft(m?.author_context ?? '');
            }}
            disabled={running}
          >
            <option value="">— 등록된 원고 선택 —</option>
            {manuscripts.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.part_label ? ` (${m.part_label})` : ''} · {m.char_count.toLocaleString()}자
                {m.author_context ? ' · 컨텍스트 있음' : ''}
              </option>
            ))}
          </select>

          {manuscriptId && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                작가 컨텍스트 (선택 — 이력·기존 작품·기획 의도·협업 메모. 개입 강도 판정과 실명 리스크 평가에 반영됩니다)
              </p>
              <Textarea
                value={ctxDraft}
                onChange={(e) => setCtxDraft(e.target.value)}
                rows={5}
                placeholder={'예)\n- 작가: 전직 PD, 파업 투쟁 실화 보유 (작중 활극의 원형)\n- 기존 작품: 자기계발 에세이 2권 — 독자들이 "읽어도 실행 못 한다"는 반응\n- 기획 의도: 자기계발서 패턴을 최소화한 무협 타임루프 소설. 핵심 반전은 배우자의 시간'}
                disabled={running}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={ctxSaving || running}
                onClick={async () => {
                  setCtxSaving(true);
                  try {
                    const res = await fetch(`/api/lab/manuscripts/${manuscriptId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ author_context: ctxDraft }),
                    });
                    if (res.ok) await loadManuscripts();
                  } finally {
                    setCtxSaving(false);
                  }
                }}
              >
                {ctxSaving ? '저장 중…' : '컨텍스트 저장'}
              </Button>
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <p className="text-sm text-muted-foreground">또는 새 원고 등록 (.pdf / .txt / .md)</p>
            <div className="flex gap-2">
              <Input placeholder="제목" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={running} />
              <Input placeholder="부 (예: 2부)" className="w-28" value={newPart} onChange={(e) => setNewPart(e.target.value)} disabled={running} />
            </div>
            <Textarea
              placeholder="작가 컨텍스트 (선택) — 이력·기존 작품·기획 의도"
              value={newCtx}
              onChange={(e) => setNewCtx(e.target.value)}
              rows={3}
              disabled={running}
            />
            <div className="flex gap-2 items-center">
              <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="text-sm" disabled={running} />
              <Button variant="outline" size="sm" onClick={handleUpload} disabled={uploading || running}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 실행 옵션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {(['I', 'D', 'R', 'F'] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(m)}
                disabled={running}
              >
                {m} — {{ I: '아이디어', D: '초고', R: '수정고', F: '완고' }[m]}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground w-10">모델</span>
            {(['gemini-2.5-flash', 'gemini-2.5-pro'] as const).map((m) => (
              <Button
                key={m}
                variant={model === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModel(m)}
                disabled={running}
              >
                {m === 'gemini-2.5-flash' ? 'Flash — 빠름·저비용' : 'Pro — 깊은 분석·느림'}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="시놉시스 (선택 — 있으면 0.5단계 대조 실행)"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            disabled={running}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {runId && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/lab/runs/${runId}`)}>
              실행 상세로 이동
            </Button>
          )}
        </div>
      )}

      {!running ? (
        <Button onClick={handleStart} size="lg">
          실행 시작
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 파이프라인 실행 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stepsPlan.map((s) => (
                <span
                  key={s}
                  className={`px-2 py-1 rounded text-xs border ${
                    doneSteps.includes(s)
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === s
                        ? 'border-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {s} {STEP_LABEL[s]}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              단계당 수십 초~수 분 걸릴 수 있습니다. 창을 닫아도 실행 상세에서 이어서 진행할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
