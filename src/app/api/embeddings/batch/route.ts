import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbeddings } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 소량 청크의 임베딩 생성 + DB 저장 (Vercel Hobby 10초 이내 완료 가능)
export async function POST(req: Request) {
  try {
    const { chunks, fileName, assistantId, docType, gcsUri, assistantName, totalChunks, startIndex } = await req.json();

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: '청크 데이터가 없습니다.' }, { status: 400 });
    }

    const embeddings = await generateEmbeddings(chunks);

    const rows = chunks.map((chunk: string, i: number) => ({
      content: chunk,
      metadata: {
        fileName,
        chunkIndex: startIndex + i,
        totalChunks,
        ...(assistantName ? { assistantName } : {}),
      },
      embedding: JSON.stringify(embeddings[i]),
      assistant_id: assistantId || null,
      doc_type: docType || 'script',
      source_file: fileName,
      gcs_uri: gcsUri,
    }));

    const { error: insertErr } = await supabase.from('documents').insert(rows);
    if (insertErr) {
      throw new Error(`벡터 저장 실패: ${insertErr.message}`);
    }

    return NextResponse.json({
      success: true,
      processed: chunks.length,
      startIndex,
    });
  } catch (err: any) {
    console.error('[Embeddings Batch]', err);
    const msg = err.status === 429
      ? 'AI API 요청 한도 초과 — 잠시 후 다시 시도해주세요.'
      : err.message || '임베딩 처리 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: err.status === 429 ? 429 : 500 });
  }
}
