import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET: 문서 요약 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sourceFile = searchParams.get('source_file');
    const assistantId = searchParams.get('assistant_id');

    if (!sourceFile) {
      return NextResponse.json({ error: 'source_file이 필요합니다.' }, { status: 400 });
    }

    let query = supabase
      .from('document_summaries')
      .select('*')
      .eq('source_file', sourceFile);

    if (assistantId) {
      query = query.eq('assistant_id', assistantId);
    } else {
      query = query.is('assistant_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[Summary] 조회 실패:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ summary: null, message: '요약이 아직 생성되지 않았습니다.' });
    }

    return NextResponse.json({
      summary: data.summary,
      charCount: data.char_count,
      chunkCount: data.chunk_count,
      createdAt: data.created_at,
    });
  } catch (err: any) {
    console.error('[Summary Exception]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
