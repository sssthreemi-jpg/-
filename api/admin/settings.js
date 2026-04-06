/**
 * Vercel Serverless: /api/admin/settings
 * GET  — 전체 설정 조회
 * PUT  — 설정 업데이트 (body: { key, value })
 */
const { handlePreflight } = require('../_shared/cors');
const { supabase, requireAdmin } = require('../_shared/supabase');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { user } = auth;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      if (error) throw error;

      // key-value 맵으로 변환
      const settings = {};
      for (const row of data || []) {
        settings[row.key] = { value: row.value, updated_at: row.updated_at, updated_by: row.updated_by };
      }
      return res.json(settings);
    }

    if (req.method === 'PUT') {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key가 필요합니다.' });
      if (value === undefined) return res.status(400).json({ error: 'value가 필요합니다.' });

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        });

      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Admin/Settings]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
