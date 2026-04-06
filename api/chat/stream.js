/**
 * Vercel Serverless: POST /api/chat/stream
 * SSE 스트리밍 챗봇 — server/routes/chatStream.js 재사용
 */
const { handlePreflight } = require('../_shared/cors');
const chatStreamHandler = require('../../server/routes/chatStream');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return chatStreamHandler(req, res);
};
