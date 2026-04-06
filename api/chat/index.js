/**
 * Vercel Serverless: POST /api/chat
 * 기존 server/routes/chat.js 핸들러를 재사용
 */
const { handlePreflight } = require('../_shared/cors');
const chatHandler = require('../../server/routes/chat');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 기존 Express 핸들러 호출
  return chatHandler(req, res);
};
