import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/lab/guard';

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

  const { title, part_label, content } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: '제목과 원고 본문이 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lab_manuscripts')
    .insert({ title, part_label: part_label || null, content, char_count: content.length })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
