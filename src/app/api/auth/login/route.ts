import { NextResponse } from 'next/server';
import { login, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password, rememberMe } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await login(username, password, !!rememberMe);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });
    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
    if (rememberMe) {
      cookieOptions.maxAge = SESSION_MAX_AGE;
    }
    response.cookies.set(SESSION_COOKIE, result.token!, cookieOptions);

    return response;
  } catch {
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
