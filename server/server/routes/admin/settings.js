/**
 * 시스템 설정 API
 * GET /api/admin/settings — 전체 설정 조회
 * PUT /api/admin/settings/:key — 설정 업데이트
 */
const express = require('express');
const { adminAuth, supabase, safeError } = require('./middleware');

const router = express.Router();
router.use(adminAuth);

// 전체 설정 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');
    if (error) throw error;

    // key-value 맵으로 변환
    const settings = {};
    for (const row of data || []) {
      settings[row.key] = { value: row.value, updated_at: row.updated_at, updated_by: row.updated_by };
    }
    res.json(settings);
  } catch (err) {
    safeError(res, err, '설정 조회');
  }
});

// 설정 업데이트
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'value가 필요합니다.' });

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: req.params.key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: req.userId !== 'dev-admin' ? req.userId : null,
      });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, '설정 업데이트');
  }
});

module.exports = router;
