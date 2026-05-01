import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const APP_ID = process.env.APP_ID || 'genie_assistant';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    let query = supabase
      .from('conversations')
      .select('id, title, assistant_id, created_at, updated_at')
      .eq('id', id)
      .eq('app_id', APP_ID);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: conversation, error: convError } = await query.single();

    if (convError) throw convError;
    if (!conversation) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    return NextResponse.json({ conversation, messages: messages || [] });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title 필요' }, { status: 400 });
    }

    let query = supabase
      .from('conversations')
      .update({ title })
      .eq('id', id)
      .eq('app_id', APP_ID);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.select('id, title, updated_at').single();

    if (error) throw error;

    return NextResponse.json({ success: true, conversation: data });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    let query = supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('app_id', APP_ID);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
