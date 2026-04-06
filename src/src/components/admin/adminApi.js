/**
 * admin API 호출 유틸리티 — 인증 헤더 자동 포함
 */
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api/admin`;

export async function adminFetch(path, options = {}) {
  // Supabase 세션에서 토큰 가져오기
  const { supabase } = await import('../../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `서버 오류 (${res.status})`);
  }
  return res.json();
}
