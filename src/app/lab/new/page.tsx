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
  const [synopsis, setSynopsis] = useState('');
  const [error, setError] = useState('');

  // 새 원고 업로드
  const [newTitle, setNewTitle] = useState('');
  const [newPart, setNewPart] = useState('');
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
      setError('원고 제목과 텍스트 파일(.txt/.md)이 필요합니다.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const content = await file.text();
      const res = await fetch('/api/lab/manuscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, part_label: newPart || null, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTitle('');
      setNewPart('');
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
        body: JSON.stringify({ manuscript_id: manuscriptId, mode, synopsis: synopsis || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRunId(data.id);
      setStepsPlan(data.steps);
      // advance 루프 — 한 호출 = 한 단계. 브라우저를 닫아도 상세 화면에서 이어 실행 가능
      let done = false;
      while (!done) {
        const ares = await fetch(`/api/lab/runs/${data.id}/advance`, { method: 'POST' });
        const adv = await ares.json();
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
            onChange={(e) => setManuscriptId(e.target.value)}
            disabled={running}
          >
            <option value="">— 등록된 원고 선택 —</option>
            {manuscripts.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.part_label ? ` (${m.part_label})` : ''} · {m.char_count.toLocaleString()}자
              </option>
            ))}
          </select>

          <div className="border-t pt-3 space-y-2">
            <p className="text-sm text-muted-foreground">또는 새 원고 등록 (.txt / .md)</p>
            <div className="flex gap-2">
              <Input placeholder="제목" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={running} />
              <Input placeholder="부 (예: 2부)" className="w-28" value={newPart} onChange={(e) => setNewPart(e.target.value)} disabled={running} />
            </div>
            <div className="flex gap-2 items-center">
              <input ref={fileRef} type="file" accept=".txt,.md" className="text-sm" disabled={running} />
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
          <Textarea
            placeholder="시놉시스 (선택 — 있으면 0.5단계 대조 실행)"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
            disabled={running}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
