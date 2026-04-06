/**
 * Vercel Serverless 공통 CORS + 보안 헤더 헬퍼
 */
function applyCors(req, res) {
  const origin = req.headers.origin;

  // 명시적 허용 목록 (환경변수 설정 시)
  if (process.env.CORS_ORIGINS) {
    const allowedOrigins = process.env.CORS_ORIGINS.split(',');
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (origin) {
    // Vercel 배포: 같은 프로젝트의 모든 URL 허용
    const isVercel = origin.endsWith('.vercel.app');
    const isLocal = origin.startsWith('http://localhost');
    const isProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      && origin === `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

    if (isVercel || isLocal || isProdUrl) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 보안 헤더
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).end();
    return true;
  }
  applyCors(req, res);
  return false;
}

module.exports = { applyCors, handlePreflight };
