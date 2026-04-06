/**
 * admin 역할 검증 미들웨어
 * Authorization Bearer 토큰으로 사용자 확인 → profiles.role === 'admin' 검증
 */
const { createClient } = require('@supabase/supabase-js');

// Supabase URL/Key가 없으면 더미 클라이언트 (개발 모드)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

async function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: '인증이 필요합니다.' });

  // Supabase 미설정: 프로덕션이면 차단, 개발이면 바이패스
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: '인증 서비스를 사용할 수 없습니다.' });
    }
    req.userId = 'dev-admin';
    return next();
  }

  try {
    let user = null;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
        const { data, err } = await supabase.auth.admin.getUserById(payload.sub);
        if (!err && data?.user) user = data.user;
      }
    } catch {}
    if (!user) return res.status(401).json({ error: '인증이 만료되었습니다.' });

    // admin 역할 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

/** 프로덕션에서는 일반 에러 메시지만 반환 (DB 스키마 노출 방지) */
function safeError(res, err, context = '처리') {
  console.error(`[Admin] ${context} 오류:`, err.message);
  const message = process.env.NODE_ENV === 'production'
    ? `${context} 중 오류가 발생했습니다.`
    : err.message;
  res.status(500).json({ error: message });
}

module.exports = { adminAuth, supabase, safeError };
