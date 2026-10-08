import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/lab/guard';
import { labDb as supabase } from '@/lib/lab/db';


/** 작가 컨텍스트 수정 (원고 단위) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { author_context } = await req.json();

  const { error } = await supabase
    .from('lab_manuscripts')
    .update({ author_context: (author_context ?? '').trim() || null })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
