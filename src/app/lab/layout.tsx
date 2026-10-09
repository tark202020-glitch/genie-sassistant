import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser } from '@/lib/lab/guard';
import './lab.css';

export const metadata = { title: '피드백 랩 — 지작' };

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) notFound(); // 비관리자에게는 페이지 존재 자체를 숨긴다

  return (
    // 랩은 라이트 모드 고정 — 전역 테마와 무관하게 light 변수 스코프를 강제한다 (긴 글 가독성)
    <div className="light min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center gap-6">
        <Link href="/lab" className="font-bold text-lg">
          피드백 랩
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/lab" className="hover:text-foreground">실행 목록</Link>
          <Link href="/lab/new" className="hover:text-foreground">새 실행</Link>
          <Link href="/lab/metrics" className="hover:text-foreground">지표</Link>
        </nav>
        <span className="ml-auto text-xs text-muted-foreground">내부 전용 · {user.name}</span>
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
