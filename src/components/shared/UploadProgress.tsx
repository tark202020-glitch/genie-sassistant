'use client';

import { Cloud, Bot, CheckCircle2, X } from 'lucide-react';
import type { UploadStep } from '@/types';

interface UploadProgressProps {
  step: UploadStep;
  message: string;
  onClose?: () => void;
}

const STEPS = [
  { key: 'uploading-gcs' as const, label: 'GCS', icon: Cloud },
  { key: 'importing-ai' as const, label: '인덱싱', icon: Bot },
  { key: 'complete' as const, label: '완료', icon: CheckCircle2 },
];

export function UploadProgress({ step, message, onClose }: UploadProgressProps) {
  if (step === 'idle') return null;

  const currentIndex = STEPS.findIndex(s => s.key === step);
  const isError = step === 'error';

  return (
    <div className="mx-3 mb-2 p-2.5 rounded-lg bg-background/80 border border-border">
      <div className="flex items-center gap-1 mb-1.5">
        {STEPS.map((s, i) => {
          const isPast = currentIndex > i;
          const isActive = s.key === step;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isPast
                    ? 'bg-green-500 text-white'
                    : isActive && !isError
                    ? 'bg-blue-500 text-white animate-pulse'
                    : isError && isActive
                    ? 'bg-red-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-3 h-0.5 ${isPast ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p
        className={`text-xs ${
          isError ? 'text-red-400' : step === 'complete' ? 'text-green-400' : 'text-muted-foreground'
        }`}
      >
        {message}
      </p>
      {isError && onClose && (
        <button
          onClick={onClose}
          className="mt-1 flex items-center gap-1 text-xs text-blue-400 hover:underline"
        >
          <X className="w-3 h-3" /> 닫기
        </button>
      )}
    </div>
  );
}
