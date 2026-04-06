/**
 * 대화 로그 조회 API
 * GET /api/admin/logs — 필터링된 대화 로그
 */
const express = require('express');
const { adminAuth, supabase, safeError } = require('./middleware');

const router = express.Router();
router.use(adminAuth);

router.get('/', async (req, res) => {
  try {
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
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds);

    const profileMap = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    const logs = (data || []).map((m) => ({
      ...m,
      user_name: profileMap[m.user_id]?.display_name || profileMap[m.user_id]?.email || '알 수 없음',
    }));

    res.json({ logs, total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    safeError(res, err, '대화 로그 조회');
  }
});

module.exports = router;
