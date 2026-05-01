import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { storage, BUCKET_NAME } from '@/lib/gcs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET: 학습된 문서 목록 조회 (pgvector documents 테이블에서)
export async function GET() {
  try {
    // Supabase에서 레벨1 문서 목록 (assistant_id가 NULL인 문서)
    const { data, error } = await supabase
      .from('documents')
      .select('source_file, gcs_uri, doc_type, created_at')
      .is('assistant_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // source_file별로 그룹화
    const groupedMap = new Map<string, any>();
    for (const row of (data || [])) {
      const key = row.source_file || row.gcs_uri;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          id: key,
          docName: '',
          source: row.source_file || '',
          gcsUri: row.gcs_uri || '',
          indexed: true,
          indexTime: row.created_at
            ? new Date(row.created_at).toLocaleString('ko-KR')
            : null,
          docType: row.doc_type || 'script',
          chunkCount: 1,
        });
      } else {
        groupedMap.get(key).chunkCount += 1;
      }
    }

    const docList = Array.from(groupedMap.values());
    return NextResponse.json({ documents: docList });
  } catch (err: any) {
    console.error('[Documents Error] 목록 조회 실패:', err.message);

    // 폴백: GCS 버킷에서 직접 파일 목록 조회
    try {
      console.log('[Documents] GCS 버킷에서 파일 목록 조회 시도...');
      const bucket = storage.bucket(BUCKET_NAME);
      const [files] = await bucket.getFiles({ prefix: 'database/' });

      const docList = files
        .filter(f => !f.name.endsWith('/'))
        .map(f => ({
          id: f.name,
          docName: '',
          source: f.name.split('/').pop() || f.name,
          gcsUri: `gs://${BUCKET_NAME}/${f.name}`,
          indexed: false,
          indexTime: f.metadata?.updated
            ? new Date(f.metadata.updated).toLocaleString('ko-KR')
            : null,
        }));

      return NextResponse.json({ documents: docList });
    } catch (gcsErr: any) {
      console.error('[Documents Error] GCS 파일 목록 조회도 실패:', gcsErr.message);
      return NextResponse.json({ error: '문서 목록 조회에 실패했습니다.' }, { status: 500 });
    }
  }
}

// DELETE: pgvector + GCS에서 문서 삭제
export async function DELETE(req: Request) {
  try {
    const { source, gcsUri } = await req.json();

    if (!source && !gcsUri) {
      return NextResponse.json({ error: '삭제할 파일이 지정되지 않았습니다.' }, { status: 400 });
    }

    const results: string[] = [];

    // 1. Supabase documents 테이블에서 해당 파일의 모든 청크 삭제
    if (source) {
      const { error: deleteErr, count } = await supabase
        .from('documents')
        .delete({ count: 'exact' })
        .eq('source_file', source)
        .is('assistant_id', null);

      if (deleteErr) {
        console.error('[Documents] pgvector 삭제 실패:', deleteErr.message);
      } else {
        console.log(`[Documents] pgvector 삭제 완료: ${count}개 청크`);
        results.push(`벡터 DB에서 ${count}개 청크 삭제됨`);
      }
    }

    // 2. GCS에서 파일 삭제
    if (gcsUri) {
      const gcsPath = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
      try {
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(gcsPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          console.log(`[Documents] GCS 파일 삭제 완료: ${gcsUri}`);
          results.push('GCS 파일 삭제됨');
        } else {
          console.log(`[Documents] GCS 파일 이미 없음: ${gcsUri}`);
          results.push('GCS 파일 없음 (이미 삭제됨)');
        }
      } catch (gcsErr: any) {
        console.error(`[Documents] GCS 파일 삭제 실패:`, gcsErr.message);
      }
    }

    console.log(`[Documents] "${source}" 삭제 결과:`, results.join(', '));
    return NextResponse.json({
      success: true,
      message: `"${source}" 삭제 완료. (${results.join(', ')})`,
    });
  } catch (err: any) {
    console.error('[Documents Exception]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
