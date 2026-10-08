import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/lab/guard';
import { labDb as supabase } from '@/lib/lab/db';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { verdict, reason } = await req.json();

  if (!['adopted', 'rejected', 'disputed'].includes(verdict)) {
    return NextResponse.json({ error: '판정은 adopted/rejected/disputed 중 하나입니다.' }, { status: 400 });
  }
  if (verdict === 'rejected' && !reason?.trim()) {
    return NextResponse.json({ error: '기각에는 이유가 필요합니다.' }, { status: 400 });
  }

  const { data: item } = await supabase
    .from('lab_items')
    .select('id, item_type, payload, lab_runs(manuscript_id)')
    .eq('id', id)
    .single();
  if (!item) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 });

  const { error } = await supabase
    .from('lab_verdicts')
    .upsert(
      { item_id: id, verdict, reason: reason || null, decided_at: new Date().toISOString() },
      { onConflict: 'item_id' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 채택된 항목은 골드 데이터로 축적 (정정 로그 → 골드)
  if (verdict === 'adopted') {
    const manuscriptId = (item as any).lab_runs?.manuscript_id;
    if (manuscriptId) {
      await supabase.from('lab_gold').insert({
        manuscript_id: manuscriptId,
        item_type: item.item_type,
        payload: item.payload,
        source: 'verdict',
      });
    }
  }

  return NextResponse.json({ ok: true });
}
