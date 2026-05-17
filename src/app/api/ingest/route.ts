import { NextResponse } from 'next/server';
import { splitTextIntoChunks, extractTextFromBuffer } from '@/lib/embeddings';
import { storage, BUCKET_NAME } from '@/lib/gcs';

// Step 1: GCS 업로드 + 텍스트 추출 + 청킹 (10초 이내 완료)
// 임베딩 생성은 클라이언트가 /api/embeddings/batch를 반복 호출하여 처리
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;

    const gcsPath = `database/${fileName}`;
    const gcsUri = `gs://${BUCKET_NAME}/${gcsPath}`;

    // 1. GCS에 파일 업로드
    const bucket = storage.bucket(BUCKET_NAME);
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(buffer, {
      metadata: { contentType: file.type || 'application/octet-stream' },
    });

    // 2. 텍스트 추출
    const text = await extractTextFromBuffer(buffer, fileName);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        warning: 'GCS 업로드는 성공했지만, 파일에서 텍스트를 추출할 수 없습니다.',
        gcsUri,
      });
    }

    // 3. 텍스트 청킹
    const chunks = await splitTextIntoChunks(text);

    return NextResponse.json({
      success: true,
      step: 'chunks_ready',
      gcsUri,
      fileName,
      assistantId: null,
      assistantName: null,
      docType: 'script',
      chunks,
      totalChunks: chunks.length,
      charCount: text.length,
    });

  } catch (err: any) {
    console.error('[Ingest Exception]', err);
    const msg = err.status === 429
      ? 'AI API 요청 한도 초과 — 잠시 후 다시 시도해주세요.'
      : `업로드 실패: ${err.message}`;
    return NextResponse.json({ error: msg }, { status: err.status === 429 ? 429 : 500 });
  }
}
