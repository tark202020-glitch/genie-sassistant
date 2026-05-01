import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, generateSalt } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { username, password, name } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      );
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        username,
        password_hash: passwordHash,
        salt,
        name: name || username,
      })
      .select('id, username, name')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '회원 등록 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
