import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/lab/guard';
import { advanceRun } from '@/lib/lab/pipeline';

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const result = await advanceRun(id);
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
