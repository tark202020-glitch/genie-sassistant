import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDocumentSummary } from '@/lib/embeddings';

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

// POST: 문서 요약 생성 + 저장 (Step 3 — 임베딩 완료 후 호출)
export async function POST(req: Request) {
  try {
    const { fileName, assistantId, docType, gcsUri, charCount, chunkCount, textSample } = await req.json();

    if (!fileName || !textSample) {
      return NextResponse.json({ error: 'fileName과 textSample이 필요합니다.' }, { status: 400 });
    }

    const summary = await generateDocumentSummary(textSample, fileName);

    const { data: existing } = await supabase
      .from('document_summaries')
      .select('id')
      .eq('source_file', fileName)
      .eq('assistant_id', assistantId || '')
      .maybeSingle();

    // assistant_id가 null인 경우 별도 처리
    let existingSummary = existing;
    if (!assistantId) {
      const { data: nullAssistant } = await supabase
        .from('document_summaries')
        .select('id')
        .eq('source_file', fileName)
        .is('assistant_id', null)
        .maybeSingle();
      existingSummary = nullAssistant;
    }

    if (existingSummary) {
      await supabase.from('document_summaries')
        .update({ summary, doc_type: docType || 'script', char_count: charCount, chunk_count: chunkCount, updated_at: new Date().toISOString() })
        .eq('id', existingSummary.id);
    } else {
      await supabase.from('document_summaries').insert({
        source_file: fileName,
        assistant_id: assistantId || null,
        summary,
        doc_type: docType || 'script',
        gcs_uri: gcsUri,
        char_count: charCount,
        chunk_count: chunkCount,
      });
    }

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error('[Summary POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
