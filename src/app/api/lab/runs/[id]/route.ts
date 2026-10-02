import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/lab/guard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;

  const [{ data: run }, { data: steps }, { data: items }] = await Promise.all([
    supabase
      .from('lab_runs')
      .select('id, mode, synopsis, status, versions, metrics, created_at, finished_at, manuscript_id, lab_manuscripts(title, part_label)')
      .eq('id', id)
      .single(),
    supabase
      .from('lab_run_steps')
      .select('step, status, output, error, updated_at')
      .eq('run_id', id),
    supabase
      .from('lab_items')
      .select('id, step, item_type, payload, lab_verdicts(verdict, reason, decided_at)')
      .eq('run_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!run) return NextResponse.json({ error: '실행을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ run, steps: steps ?? [], items: items ?? [] });
}
