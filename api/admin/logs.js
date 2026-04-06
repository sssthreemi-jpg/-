/**
 * Vercel Serverless: /api/admin/logs
 * GET — 필터링된 대화 로그 조회
 *
 * Query params:
 *   user_id, from, to, keyword, page (default 1), limit (default 50)
 */
const { handlePreflight } = require('../_shared/cors');
const { supabase, requireAdmin } = require('../_shared/supabase');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user_id, from, to, keyword, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('chat_messages')
      .select('id, session_id, user_id, role, content, token_usage, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (keyword) query = query.ilike('content', `%${keyword}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    // 사용자 이름 매핑
    const userIds = [...new Set((data || []).map((m) => m.user_id))];
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);

      for (const p of profiles || []) profileMap[p.id] = p;
    }

    const logs = (data || []).map((m) => ({
      ...m,
      user_name: profileMap[m.user_id]?.display_name || profileMap[m.user_id]?.email || '알 수 없음',
    }));

    return res.json({ logs, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Admin/Logs]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
