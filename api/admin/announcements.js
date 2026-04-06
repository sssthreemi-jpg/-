/**
 * Vercel Serverless: /api/admin/announcements
 * GET    — 공지사항 목록 조회
 * POST   — 새 공지 작성 (body: { title, content, expires_at? })
 * PUT    — 공지 수정 (body: { id, title?, content?, is_active?, expires_at? })
 * DELETE — 공지 삭제 (body: { id })
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
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }

    if (req.method === 'POST') {
      const { title, content, expires_at } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용이 필요합니다.' });
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title,
          content,
          is_active: true,
          created_by: user.id,
          expires_at: expires_at || null,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, title, content, is_active, expires_at } = req.body;
      if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });

      const update = {};
      if (title !== undefined) update.title = title;
      if (content !== undefined) update.content = content;
      if (is_active !== undefined) update.is_active = is_active;
      if (expires_at !== undefined) update.expires_at = expires_at;

      const { error } = await supabase
        .from('announcements')
        .update(update)
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Admin/Announcements]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
