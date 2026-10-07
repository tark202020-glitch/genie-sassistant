import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/lab/guard';
import { computeMetrics, LabItemRow } from '@/lib/lab/metrics';

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

  const { data: run } = await supabase
    .from('lab_runs')
    .select('id, mode, status, versions, metrics, created_at, manuscript_id, lab_manuscripts(title, part_label)')
    .eq('id', id)
    .single();
  if (!run) return NextResponse.json({ error: '실행을 찾을 수 없습니다.' }, { status: 404 });

  const [{ data: steps }, { data: itemRows }, { data: gold }] = await Promise.all([
    supabase.from('lab_run_steps').select('step, output').eq('run_id', id),
    supabase
      .from('lab_items')
      .select('id, item_type, payload, lab_verdicts(verdict)')
      .eq('run_id', id),
    supabase.from('lab_gold').select('item_type, payload').eq('manuscript_id', run.manuscript_id),
  ]);

  const stepOutputs: Record<string, any> = {};
  for (const s of steps ?? []) if (s.output && typeof s.output === 'object') stepOutputs[s.step] = s.output;

  const items: LabItemRow[] = (itemRows ?? []).map((r: any) => {
    const v = Array.isArray(r.lab_verdicts) ? r.lab_verdicts[0] : r.lab_verdicts;
    return { id: r.id, item_type: r.item_type, payload: r.payload, verdict: v?.verdict ?? null };
  });

  const result = computeMetrics(stepOutputs, items, gold ?? [], (run as any).lab_manuscripts?.title);

  // A/B 비교용 결함 요약 (A·B급만)
  const issueSummary = items
    .filter((i) => i.item_type === 'issue' && ['A', 'B'].includes(i.payload?.grade))
    .map((i) => ({
      rule_id: i.payload?.rule_id,
      grade: i.payload?.grade,
      loc: i.payload?.loc,
      title: String(i.payload?.diagnosis ?? '').slice(0, 80),
    }));

  return NextResponse.json({
    run: {
      id: run.id,
      created_at: run.created_at,
      model: (run.versions as any)?.model,
      prompts: (run.versions as any)?.prompts,
      tokens: (run.metrics as any)?.tokens ?? null,
      manuscript: (run as any).lab_manuscripts?.title,
    },
    ...result,
    issueSummary,
  });
}
