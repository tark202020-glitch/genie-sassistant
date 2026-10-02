import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/lab/guard';
import { extractTextFromBuffer } from '@/lib/embeddings';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await supabase
    .from('lab_manuscripts')
    .select('id, title, part_label, char_count, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ manuscripts: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const formData = await req.formData();
  const title = (formData.get('title') as string | null)?.trim();
  const partLabel = (formData.get('part_label') as string | null)?.trim();
  const file = formData.get('file') as File | null;

  if (!title || !file) {
    return NextResponse.json({ error: '제목과 원고 파일이 필요합니다.' }, { status: 400 });
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: '파일 크기가 20MB를 초과합니다.' }, { status: 400 });
  }

  const allowedTypes = ['pdf', 'txt', 'md'];
  const ext = file.name.toLowerCase().split('.').pop() || '';
  if (!allowedTypes.includes(ext)) {
    return NextResponse.json(
      { error: `지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const content = await extractTextFromBuffer(buffer, file.name);
  if (!content.trim()) {
    return NextResponse.json({ error: '파일에서 텍스트를 추출할 수 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lab_manuscripts')
    .insert({ title, part_label: partLabel || null, content, char_count: content.length })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, char_count: content.length });
}
