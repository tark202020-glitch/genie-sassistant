import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { splitTextIntoChunks, extractTextFromBuffer } from '@/lib/embeddings';
import { storage, BUCKET_NAME } from '@/lib/gcs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Step 1: GCS 업로드 + 텍스트 추출 + 청킹 (10초 이내 완료)
// 임베딩 생성은 클라이언트가 /api/embeddings/batch를 반복 호출하여 처리
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: assistant, error: fetchErr } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !assistant) {
      return NextResponse.json({ error: '보조작가를 찾을 수 없습니다.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const docType = (formData.get('docType') as string) || 'script';

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;

    const subFolder = docType === 'reference' ? 'references' : 'scripts';
    const gcsPath = `${assistant.gcs_folder}/${subFolder}/${fileName}`;
    const gcsUri = `gs://${BUCKET_NAME}/${gcsPath}`;

    // 1. GCS에 파일 업로드
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.file(gcsPath).save(buffer, {
      metadata: { contentType: file.type || 'application/octet-stream' },
    });

    // 2. 텍스트 추출
    const text = await extractTextFromBuffer(buffer, fileName);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        warning: 'GCS 업로드는 성공했지만, 파일에서 텍스트를 추출할 수 없습니다.',
        gcsUri,
        docType,
      });
    }

    // 3. 텍스트 청킹
    const chunks = await splitTextIntoChunks(text);

    return NextResponse.json({
      success: true,
      step: 'chunks_ready',
      gcsUri,
      docType,
      fileName,
      assistantId: id,
      assistantName: assistant.name,
      chunks,
      totalChunks: chunks.length,
      charCount: text.length,
    });

  } catch (err: any) {
    console.error('[Assistant Ingest Exception]', err);
    const msg = err.status === 429
      ? 'AI API 요청 한도 초과 — 잠시 후 다시 시도해주세요.'
      : err.message || '업로드 처리 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: err.status === 429 ? 429 : 500 });
  }
}
