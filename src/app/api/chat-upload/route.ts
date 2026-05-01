import { NextResponse } from 'next/server';
import { extractTextFromBuffer } from '@/lib/embeddings';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기가 20MB를 초과합니다.' }, { status: 400 });
    }

    const allowedTypes = ['pdf', 'txt', 'md', 'csv', 'hwp', 'doc', 'docx'];
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.name);

    if (!text.trim()) {
      return NextResponse.json({ error: '파일에서 텍스트를 추출할 수 없습니다.' }, { status: 400 });
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      textLength: text.length,
      text,
    });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '파일 처리 실패';
    console.error('[chat-upload] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
