import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { role, content } = await req.json();

    if (!role || !content) {
      return NextResponse.json({ error: 'role, content 필요' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, role, content })
      .select('id, role, content, created_at')
      .single();

    if (error) throw error;

    // 대화의 updated_at도 갱신
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true, message: data });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
