/**
 * 공지사항 CRUD API
 */
const express = require('express');
const { adminAuth, supabase, safeError } = require('./middleware');

const router = express.Router();
router.use(adminAuth);

// 목록 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    safeError(res, err, '공지사항 목록 조회');
  }
});

// 새 공지 작성
router.post('/', async (req, res) => {
  try {
    const { title, content, expires_at } = req.body;
    if (!title || !content) return res.status(400).json({ error: '제목과 내용이 필요합니다.' });

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        is_active: true,
        created_by: req.userId !== 'dev-admin' ? req.userId : null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    safeError(res, err, '공지사항 작성');
  }
});

// 수정 (활성화/비활성화 포함)
router.put('/:id', async (req, res) => {
  try {
    const { title, content, is_active, expires_at } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (is_active !== undefined) update.is_active = is_active;
    if (expires_at !== undefined) update.expires_at = expires_at;

    const { error } = await supabase
      .from('announcements')
      .update(update)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, '공지사항 수정');
  }
});

// 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, '공지사항 삭제');
  }
});

module.exports = router;
