/**
 * Vercel Serverless: /api/admin/usage
 * GET — 월간 사용량 요약 (?type=daily 이면 일별 사용량)
 *
 * Query params:
 *   year, month — 대상 연/월 (기본값: 현재)
 *   type=daily  — 일별 사용량 반환
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

    const { year, month, type } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('api_usage')
      .select('input_tokens, output_tokens, estimated_cost, created_at')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at');

    if (error) throw error;

    // 일별 사용량
    if (type === 'daily') {
      const dailyMap = {};
      for (const row of data || []) {
        const day = row.created_at.slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { date: day, requests: 0, cost: 0, tokens: 0 };
        dailyMap[day].requests += 1;
        dailyMap[day].cost += parseFloat(row.estimated_cost || 0);
        dailyMap[day].tokens += (row.input_tokens || 0) + (row.output_tokens || 0);
      }

      const daily = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({ ...d, cost: +d.cost.toFixed(4) }));

      return res.json({ daily });
    }

    // 월간 사용량 요약
    const totalInput = (data || []).reduce((s, r) => s + (r.input_tokens || 0), 0);
    const totalOutput = (data || []).reduce((s, r) => s + (r.output_tokens || 0), 0);
    const totalCost = (data || []).reduce((s, r) => s + parseFloat(r.estimated_cost || 0), 0);
    const totalRequests = (data || []).length;

    // 비용 상한 조회
    const { data: limitSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'monthly_cost_limit')
      .single();

    const costLimit = limitSetting?.value?.usd || 50;

    return res.json({
      year: y,
      month: m,
      totalRequests,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCost: +totalCost.toFixed(4),
      costLimit,
      usagePercent: costLimit > 0 ? +((totalCost / costLimit) * 100).toFixed(1) : 0,
      avgCostPerRequest: totalRequests > 0 ? +(totalCost / totalRequests).toFixed(4) : 0,
    });
  } catch (err) {
    console.error('[Admin/Usage]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
