import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface LabUser {
  id: string;
  username: string;
  name: string;
  is_admin: boolean;
}

/** 피드백 랩 접근 가드 — 관리자가 아니면 null */
export async function getAdminUser(): Promise<LabUser | null> {
  const user = (await getCurrentUser()) as LabUser | null;
  if (!user || !user.is_admin) return null;
  return user;
}

/** API 핸들러용 — 비관리자에게는 존재를 숨기기 위해 404 */
export async function requireAdmin(): Promise<{ user: LabUser } | { error: NextResponse }> {
  const user = await getAdminUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not Found' }, { status: 404 }) };
  }
  return { user };
}
