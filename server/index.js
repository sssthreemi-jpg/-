/**
 * Express 서버 진입점 — 챗봇 백엔드
 * 포트 3001, 프론트엔드(localhost:5173)와 CORS 허용
 */

require('dotenv').config();

// 회사 네트워크 SSL 프록시(자체 서명 인증서) 대응 — 개발 환경 전용
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ─── 글로벌 에러 핸들러 — 서버 크래시 방지 ───
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { preload } = require('./data/loader');
const chatHandler = require('./routes/chat');
const chatStreamHandler = require('./routes/chatStream');
const adminUsers = require('./routes/admin/users');
const adminUsage = require('./routes/admin/usage');
const adminSettings = require('./routes/admin/settings');
const adminLogs = require('./routes/admin/logs');
const adminAnnouncements = require('./routes/admin/announcements');
const adminStats = require('./routes/admin/stats');
const signupRequest = require('./routes/signup-request');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 보안 헤더 (helmet) ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.anthropic.com"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS (환경변수 기반) ───
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['POST', 'GET', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ───
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 20,               // 채팅: 분당 20회
  keyGenerator: (req) => req.userId || ipKeyGenerator(req),
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,               // 관리자 API: 분당 60회
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// ─── 라우트 ───
app.use('/api/signup-request', signupRequest);  // 공개 API (인증 불필요)
app.post('/api/chat', chatLimiter, chatHandler);
app.post('/api/chat/stream', chatLimiter, chatStreamHandler);

// Admin API (rate limiting 적용)
app.use('/api/admin', adminLimiter);
app.use('/api/admin/users', adminUsers);
app.use('/api/admin/usage', adminUsage);
app.use('/api/admin/settings', adminSettings);
app.use('/api/admin/logs', adminLogs);
app.use('/api/admin/announcements', adminAnnouncements);
app.use('/api/admin/stats', adminStats);

// 루트 — API 안내
app.get('/', (req, res) => {
  res.send(`
    <h2>손익 드릴다운 챗봇 API 서버</h2>
    <p>상태: 정상 운영 중</p>
    <ul>
      <li><b>POST /api/chat</b> — 챗봇 메시지 처리 (JSON)</li>
      <li><b>POST /api/chat/stream</b> — 챗봇 스트리밍 (SSE)</li>
      <li><a href="/api/health">GET /api/health</a> — 헬스체크</li>
    </ul>
    <p>프론트엔드: <a href="http://localhost:5173">http://localhost:5173</a></p>
  `);
});

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 서버 시작 ───
console.log('\n📊 손익 드릴다운 챗봇 서버 시작...');
console.log('  데이터 사전 로딩 중...');
preload();

app.listen(PORT, () => {
  console.log(`\n  ✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`  📡 API 엔드포인트: POST http://localhost:${PORT}/api/chat (JSON)`);
  console.log(`  📡 API 스트리밍:   POST http://localhost:${PORT}/api/chat/stream (SSE)`);
  console.log(`  🔑 ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '설정됨' : '⚠️ 미설정'}\n`);
});
