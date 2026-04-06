/**
 * Vercel Serverless 공통 Supabase 클라이언트
 *
 * 서버리스 환경에서 supabase.auth.getUser(token)은
 * "Auth session missing!" 에러를 발생시킴.
 * → admin.getUserById()로 JWT payload에서 추출한 user id로 검증.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/** JWT 토큰에서 사용자 정보 추출 */
async function getUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token || !supabase) return null;
  try {
    // JWT payload 파싱
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (!payload.sub || !payload.exp) return null;
    // 만료 확인
    if (payload.exp * 1000 < Date.now()) return null;
    // admin API로 사용자 조회
    const { data, error } = await supabase.auth.admin.getUserById(payload.sub);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** 관리자 권한 검증 */
async function requireAdmin(req) {
  const user = await getUser(req);
  if (!user) return { error: '인증이 필요합니다.', status: 401 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: '관리자 권한이 필요합니다.', status: 403 };
  }

  return { user, profile };
}

module.exports = { supabase, getUser, requireAdmin };
