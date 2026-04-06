/**
 * Vercel Serverless: /api/admin/stats
 * GET — 월별 사용자별 질문 수, 토큰, 비용 통계
 *
 * Query params:
 *   year, month — 대상 연/월 (기본값: 현재)
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

    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    // 사용량 데이터
    const { data: usage, error } = await supabase
      .from('api_usage')
      .select('user_id, input_tokens, output_tokens, estimated_cost, created_at')
      .gte('created_at', startDate)
      .lt('created_at', endDate);

    if (error) throw error;

    // 사용자별 집계
    const userMap = {};
    for (const row of usage || []) {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = {
          user_id: row.user_id,
          requests: 0,
          input_tokens: 0,
          output_tokens: 0,
          cost: 0,
          last_used: null,
        };
      }
      const u = userMap[row.user_id];
      u.requests += 1;
      u.input_tokens += row.input_tokens || 0;
      u.output_tokens += row.output_tokens || 0;
      u.cost += parseFloat(row.estimated_cost || 0);
      if (!u.last_used || row.created_at > u.last_used) u.last_used = row.created_at;
    }

    // 프로필 매핑
    const userIds = Object.keys(userMap);
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);
      for (const p of profiles || []) profileMap[p.id] = p;
    }

    const stats = Object.values(userMap)
      .map((u) => ({
        ...u,
        cost: +u.cost.toFixed(4),
        display_name: profileMap[u.user_id]?.display_name || '알 수 없음',
        email: profileMap[u.user_id]?.email || '',
      }))
      .sort((a, b) => b.cost - a.cost);

    // 합계
    const totals = {
      requests: stats.reduce((s, u) => s + u.requests, 0),
      input_tokens: stats.reduce((s, u) => s + u.input_tokens, 0),
      output_tokens: stats.reduce((s, u) => s + u.output_tokens, 0),
      cost: +stats.reduce((s, u) => s + u.cost, 0).toFixed(4),
    };

    return res.json({ year: y, month: m, stats, totals });
  } catch (err) {
    console.error('[Admin/Stats]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
