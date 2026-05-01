import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const SESSION_COOKIE = 'genie_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (자동 로그인)
const SESSION_SHORT_AGE = 60 * 60 * 24; // 1 day (일반 로그인)

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function login(username: string, password: string, rememberMe = false) {
  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, username, name, password_hash, salt')
    .eq('username', username)
    .single();

  if (error || !user) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  }

  const token = generateToken();
  const ttl = rememberMe ? SESSION_MAX_AGE : SESSION_SHORT_AGE;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { error: sessionError } = await supabase
    .from('app_sessions')
    .insert({ user_id: user.id, token, expires_at: expiresAt });

  if (sessionError) {
    return { error: '세션 생성에 실패했습니다.' };
  }

  return {
    token,
    user: { id: user.id, username: user.username, name: user.name },
  };
}

export async function logout(token: string) {
  await supabase.from('app_sessions').delete().eq('token', token);
}

export async function validateSession(token: string) {
  const { data: session } = await supabase
    .from('app_sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('app_sessions').delete().eq('token', token);
    return null;
  }

  const { data: user } = await supabase
    .from('app_users')
    .select('id, username, name')
    .eq('id', session.user_id)
    .single();

  return user || null;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return await validateSession(token);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
