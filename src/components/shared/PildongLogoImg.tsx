'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface PildongLogoImgProps {
  /** height in px — width auto-scales to 2.4× aspect ratio */
  size?: number;
  className?: string;
}

/**
 * PNG 로고 이미지 — 다크/라이트 모드 자동 전환
 * light mode → logo_B.png (검정)
 * dark  mode → logo_W.png (흰색)
 */
export function PildongLogoImg({ size = 40, className = '' }: PildongLogoImgProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const width = Math.round(size * 2.4);
  const height = size;

  // SSR/hydration 전에는 두 이미지 모두 렌더 (CSS로 전환)
  if (!mounted) {
    return (
      <span className={`inline-block ${className}`} style={{ width, height }}>
        <Image
          src="/logo_B.png"
          alt="지작 로고"
          width={width}
          height={height}
          className="dark:hidden"
          priority
        />
        <Image
          src="/logo_W.png"
          alt="지작 로고"
          width={width}
          height={height}
          className="hidden dark:block"
          priority
        />
      </span>
    );
  }

  const src = resolvedTheme === 'dark' ? '/logo_W.png' : '/logo_B.png';

  return (
    <Image
      src={src}
      alt="지작 로고"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
