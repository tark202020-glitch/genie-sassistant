import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET: 저장된 분석 결과 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get('assistantId');
    const analysisType = searchParams.get('type');

    if (!assistantId) {
      return NextResponse.json({ error: 'assistantId가 필요합니다.' }, { status: 400 });
    }

    let query = supabase
      .from('script_analyses')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('updated_at', { ascending: false });

    if (analysisType) {
      query = query.eq('analysis_type', analysisType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ analyses: data || [] });
  } catch (err: any) {
    console.error('[ScriptAnalyses] 조회 실패:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: 분석 결과 저장 (upsert — 같은 assistant + type + name이면 업데이트)
export async function POST(req: Request) {
  try {
    const { assistantId, analysisType, name, data } = await req.json();

    if (!assistantId || !analysisType || !data) {
      return NextResponse.json({ error: 'assistantId, analysisType, data가 필요합니다.' }, { status: 400 });
    }

    const saveName = name || '자동 저장';

    // 기존 데이터 확인
    const { data: existing } = await supabase
      .from('script_analyses')
      .select('id')
      .eq('assistant_id', assistantId)
      .eq('analysis_type', analysisType)
      .eq('name', saveName)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('script_analyses')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('script_analyses')
        .insert({ assistant_id: assistantId, name: saveName, analysis_type: analysisType, data });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ScriptAnalyses] 저장 실패:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: 분석 결과 삭제
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '삭제할 분석 ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('script_analyses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ScriptAnalyses] 삭제 실패:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
