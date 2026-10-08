import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/lab/guard';
import { labDb as supabase } from '@/lib/lab/db';
import { stepsForMode, LabMode, LAB_MODELS, DEFAULT_LAB_MODEL } from '@/lib/lab/pipeline';
import { RULES_VERSION } from '@/lib/lab/rules';
import { PROMPTS_VERSION } from '@/lib/lab/prompts';


export const PROTOCOL_VERSION = '초고수정 프로토콜 v0.2';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await supabase
    .from('lab_runs')
    .select('id, mode, status, versions, metrics, created_at, finished_at, lab_manuscripts(title, part_label)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { manuscript_id, mode, synopsis, model } = await req.json();
  if (!manuscript_id || !['I', 'D', 'R', 'F'].includes(mode)) {
    return NextResponse.json({ error: '원고와 모드(I/D/R/F)가 필요합니다.' }, { status: 400 });
  }
  if (model && !LAB_MODELS.includes(model)) {
    return NextResponse.json({ error: `지원하지 않는 모델입니다. (${LAB_MODELS.join(', ')})` }, { status: 400 });
  }

  const { data: ms } = await supabase
    .from('lab_manuscripts')
    .select('author_context')
    .eq('id', manuscript_id)
    .single();

  const versions = {
    protocol: PROTOCOL_VERSION,
    rules: RULES_VERSION,
    prompts: PROMPTS_VERSION,
    gold: 'gold-현재시점',
    model: model || DEFAULT_LAB_MODEL,
    author_context: ms?.author_context ? `있음(${ms.author_context.length}자)` : '없음',
  };

  const { data: run, error } = await supabase
    .from('lab_runs')
    .insert({ manuscript_id, mode, synopsis: synopsis || null, versions })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const steps = stepsForMode(mode as LabMode, !!synopsis);
  await supabase
    .from('lab_run_steps')
    .insert(steps.map((step) => ({ run_id: run.id, step, status: 'pending' })));

  return NextResponse.json({ id: run.id, steps });
}
