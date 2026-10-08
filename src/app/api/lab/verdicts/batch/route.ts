import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/lab/guard';
import { labDb as supabase } from '@/lib/lab/db';

// 일괄 판정 — 화면에서 모아둔 판정을 한 번의 요청으로 저장한다 (항목별 단건 호출의 레이스 방지)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { verdicts } = await req.json();
  if (!Array.isArray(verdicts) || verdicts.length === 0 || verdicts.length > 200) {
    return NextResponse.json({ error: '판정 목록은 1~200건이어야 합니다.' }, { status: 400 });
  }
  for (const v of verdicts) {
    if (!v.item_id || !['adopted', 'rejected', 'disputed'].includes(v.verdict)) {
      return NextResponse.json({ error: '판정은 adopted/rejected/disputed 중 하나입니다.' }, { status: 400 });
    }
    if (v.verdict === 'rejected' && !v.reason?.trim()) {
      return NextResponse.json({ error: '기각에는 이유가 필요합니다.' }, { status: 400 });
    }
  }

  const ids = verdicts.map((v: any) => v.item_id);
  const { data: items, error: itemsError } = await supabase
    .from('lab_items')
    .select('id, item_type, payload, lab_runs(manuscript_id)')
    .in('id', ids);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
  const missing = ids.filter((id: string) => !itemMap.has(id));
  if (missing.length > 0) {
    return NextResponse.json({ error: `항목을 찾을 수 없습니다: ${missing.length}건` }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('lab_verdicts')
    .upsert(
      verdicts.map((v: any) => ({ item_id: v.item_id, verdict: v.verdict, reason: v.reason || null, decided_at: now })),
      { onConflict: 'item_id' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 채택된 항목은 골드 데이터로 축적 (단건 판정 라우트와 동일 규칙)
  const goldRows = verdicts
    .filter((v: any) => v.verdict === 'adopted')
    .map((v: any) => {
      const item = itemMap.get(v.item_id) as any;
      const manuscriptId = item?.lab_runs?.manuscript_id;
      return manuscriptId
        ? { manuscript_id: manuscriptId, item_type: item.item_type, payload: item.payload, source: 'verdict' }
        : null;
    })
    .filter(Boolean);
  if (goldRows.length > 0) {
    const { error: goldError } = await supabase.from('lab_gold').insert(goldRows);
    if (goldError) return NextResponse.json({ error: `판정은 저장됐으나 골드 축적 실패: ${goldError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: verdicts.length, gold: goldRows.length });
}
