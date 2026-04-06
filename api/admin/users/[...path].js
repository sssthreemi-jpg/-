/**
 * Vercel Serverless: /api/admin/users/:id 및 /api/admin/users/:id/role
 * PUT  /api/admin/users/{id}/role — 역할 변경
 * DELETE /api/admin/users/{id} — 계정 삭제
 */
const { handlePreflight } = require('../../_shared/cors');
const { supabase, requireAdmin } = require('../../_shared/supabase');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { user } = auth;

  // URL에서 path 파라미터 추출: ['userId'] 또는 ['userId', 'role']
  // Vercel catch-all은 req.query.path를 배열로 전달
  const rawPath = req.query.path;
  const pathParts = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  console.log('[users/...path]', req.method, pathParts, req.url);

  try {
    // PUT /api/admin/users/{id}/role — 역할 변경
    if (req.method === 'PUT' && pathParts.length === 2 && pathParts[1] === 'role') {
      const userId = pathParts[0];
      const { role } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "역할은 'user' 또는 'admin'이어야 합니다." });
      }
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    // DELETE /api/admin/users/{id} — 계정 삭제
    if (req.method === 'DELETE' && pathParts.length === 1) {
      const userId = pathParts[0];
      if (userId === user.id) {
        return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
      }
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    // POST /api/admin/users/invite, approve, reject 등
    if (req.method === 'POST' && pathParts.length === 1) {
      const action = pathParts[0]; // invite, approve, reject, pending-signups
      const { email, role = 'user' } = req.body || {};

      if (action === 'invite') {
        if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
        await supabase.from('allowed_emails').upsert({
          email: email.toLowerCase(),
          invited_at: new Date().toISOString(),
          invited_by: user.id,
          registered: false,
        }, { onConflict: 'email' });

        try {
          const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
          await supabase.auth.admin.inviteUserByEmail(email, {
            data: { role },
            redirectTo: `${siteUrl}/change-password`,
          });
        } catch (e) {
          console.log('초대 메일 발송 실패:', e.message);
        }
        return res.json({ success: true, message: `${email} 초대 완료` });
      }

      if (action === 'approve') {
        if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
        await supabase.from('pending_signups').update({
          status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
        }).eq('email', email).eq('status', 'pending');
        await supabase.from('allowed_emails').upsert({
          email: email.toLowerCase(), invited_at: new Date().toISOString(),
          invited_by: user.id, registered: false,
        }, { onConflict: 'email' });
        return res.json({ success: true, message: `${email} 가입 승인 완료` });
      }

      if (action === 'reject') {
        if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
        await supabase.from('pending_signups').update({
          status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
        }).eq('email', email).eq('status', 'pending');
        return res.json({ success: true, message: `${email} 가입 거부` });
      }
    }

    // GET /api/admin/users/pending-signups
    if (req.method === 'GET' && pathParts[0] === 'pending-signups') {
      const { data } = await supabase
        .from('pending_signups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return res.json({ pendingSignups: data || [] });
    }

    res.status(405).json({ error: 'Method not allowed', debug: { method: req.method, pathParts, url: req.url } });
  } catch (err) {
    console.error('[Admin/Users]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
