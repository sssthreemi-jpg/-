/**
 * API 사용량 조회
 * GET /api/admin/usage — 월간 사용량 요약
 * GET /api/admin/usage/daily — 일별 사용량
 */
const express = require('express');
const { adminAuth, supabase, safeError } = require('./middleware');

const router = express.Router();
router.use(adminAuth);

// 월간 사용량 요약
router.get('/', async (req, res) => {
  try {
    const { year, month } = req.query;
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
      .lt('created_at', endDate);

    if (error) throw error;

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

    res.json({
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
    safeError(res, err, '월간 사용량 조회');
  }
});

// 일별 사용량
router.get('/daily', async (req, res) => {
  try {
    const { year, month } = req.query;
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

    // 일별 집계
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

    res.json({ daily });
  } catch (err) {
    safeError(res, err, '일별 사용량 조회');
  }
});

module.exports = router;
