import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Storage } from '@google-cloud/storage';
import { generateEmbeddings, splitTextIntoChunks, extractTextFromBuffer } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GCP_PROJECT_ID,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'story_ai_helper';

export const maxDuration = 300; // 대용량 파일 처리를 위해 5분으로 확장

// POST: 보조작가 전용 자료 업로드 (대본/자료 구분)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 보조작가 정보 조회
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
    const docType = (formData.get('docType') as string) || 'script'; // 'script' | 'reference'

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;

    // docType에 따라 하위 폴더 분리
    const subFolder = docType === 'reference' ? 'references' : 'scripts';
    const gcsPath = `${assistant.gcs_folder}/${subFolder}/${fileName}`;
    const gcsUri = `gs://${BUCKET_NAME}/${gcsPath}`;

    console.log(`[Assistant Ingest] GCS 업로드: ${gcsUri} (유형: ${docType})`);

    // 1단계: GCS에 파일 업로드 (원본 보관)
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.file(gcsPath).save(buffer, {
      metadata: { contentType: file.type || 'application/octet-stream' },
    });

    console.log(`[Assistant Ingest] GCS 업로드 완료`);

    // 2단계: 텍스트 추출
    console.log(`[Assistant Ingest] 텍스트 추출 시작...`);
    const text = await extractTextFromBuffer(buffer, fileName);
    console.log(`[Assistant Ingest] 텍스트 추출 완료: ${text.length}자`);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        warning: 'GCS 업로드는 성공했지만, 파일에서 텍스트를 추출할 수 없습니다.',
        gcsUri,
        docType,
      });
    }

    // 3단계: 텍스트 청킹
    console.log(`[Assistant Ingest] 텍스트 청킹 시작...`);
    const chunks = await splitTextIntoChunks(text);
    console.log(`[Assistant Ingest] 청킹 완료: ${chunks.length}개 청크`);

    // 4단계: 임베딩 생성
    console.log(`[Assistant Ingest] 임베딩 생성 시작... (${chunks.length}개)`);
    const embeddings = await generateEmbeddings(chunks);
    console.log(`[Assistant Ingest] 임베딩 생성 완료`);

    // 5단계: Supabase pgvector에 저장
    console.log(`[Assistant Ingest] pgvector 저장 시작...`);
    const rows = chunks.map((chunk, i) => ({
      content: chunk,
      metadata: {
        fileName,
        chunkIndex: i,
        totalChunks: chunks.length,
        assistantName: assistant.name,
      },
      embedding: JSON.stringify(embeddings[i]),
      assistant_id: id, // 레벨2 (보조작가 전용)
      doc_type: docType,
      source_file: fileName,
      gcs_uri: gcsUri,
    }));

    // 배치 삽입 (500개씩)
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from('documents').insert(batch);
      if (insertErr) {
        console.error(`[Assistant Ingest] pgvector 저장 실패 (배치 ${i}):`, insertErr.message);
        throw new Error(`벡터 저장 실패: ${insertErr.message}`);
      }
    }

    console.log(`[Assistant Ingest] pgvector 저장 완료: ${rows.length}개 벡터`);

    const typeLabel = docType === 'reference' ? '참고자료' : '대본';
    return NextResponse.json({
      success: true,
      message: `"${fileName}" ${typeLabel}로 업로드 및 벡터 인덱싱 완료. ${chunks.length}개 청크가 보조작가 "${assistant.name}"의 전용 지식으로 저장되었습니다.`,
      gcsUri,
      docType,
      chunksCount: chunks.length,
    });

  } catch (err: any) {
    console.error('[Assistant Ingest Exception]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
