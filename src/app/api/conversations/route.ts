import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const APP_ID = process.env.APP_ID || 'genie_assistant';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    const url = new URL(req.url);
    const assistantId = url.searchParams.get('assistantId');

    let query = supabase
      .from('conversations')
      .select('id, title, assistant_id, created_at, updated_at')
      .eq('app_id', APP_ID)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    if (assistantId) {
      query = query.eq('assistant_id', assistantId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const assistantIds = [...new Set((data || []).map((c: Record<string, unknown>) => c.assistant_id).filter(Boolean))];
    let assistantMap: Record<string, string> = {};
    if (assistantIds.length > 0) {
      const { data: assistants } = await supabase
        .from('assistants')
        .select('id, name')
        .in('id', assistantIds);
      if (assistants) {
        assistantMap = Object.fromEntries(assistants.map((a: { id: string; name: string }) => [a.id, a.name]));
      }
    }

    const conversations = (data || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      title: c.title,
      assistant_id: c.assistant_id,
      assistant_name: c.assistant_id ? assistantMap[c.assistant_id as string] || null : null,
      updated_at: c.updated_at,
    }));

    return NextResponse.json({ conversations });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { assistantId, title } = await req.json();

    const insertData: Record<string, unknown> = {
      assistant_id: assistantId || null,
      title: title || '새 대화',
      app_id: APP_ID,
    };

    if (user) {
      insertData.user_id = user.id;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select('id, title, assistant_id, created_at, updated_at')
      .single();

    if (error) {
      console.error('[POST /api/conversations] Supabase error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, conversation: data });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
