/**
 * Vercel Serverless: /api/admin/users
 * GET — 사용자 목록, POST — 초대/승인/거부
 */
const { handlePreflight } = require('../../_shared/cors');
const { supabase, requireAdmin } = require('../../_shared/supabase');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { user } = auth;

  try {
    if (req.method === 'GET') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, created_at, last_login_at')
        .order('created_at', { ascending: false });

      const { data: pending } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('registered', false)
        .order('created_at', { ascending: false });

      const { data: pendingSignups } = await supabase
        .from('pending_signups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return res.json({
        users: profiles || [],
        pending: pending || [],
        pendingSignups: pendingSignups || [],
      });
    }

    if (req.method === 'POST') {
      const { action, email, role = 'user' } = req.body;

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

      return res.status(400).json({ error: '유효하지 않은 action입니다.' });
    }

    if (req.method === 'PUT') {
      const { id, role } = req.body;
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "역할은 'user' 또는 'admin'이어야 합니다." });
      }
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (id === user.id) return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Admin/Users]', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
};
