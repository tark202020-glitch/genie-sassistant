import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname === '/register' || pathname === '/landing' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('genie_session')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
