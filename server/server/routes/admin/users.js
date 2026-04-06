/**
 * 사용자 관리 API — 모든 조작을 /api/admin/users 루트에서 body 기반으로 처리
 *
 * GET    /api/admin/users          — 사용자 목록 + 초대 대기 + 가입 승인 대기
 * POST   /api/admin/users          — { action: 'invite'|'approve'|'reject', email, role? }
 * PUT    /api/admin/users          — { id, role } 역할 변경
 * DELETE /api/admin/users          — { id } 계정 삭제
 */
const express = require('express');
const { adminAuth, supabase, safeError } = require('./middleware');

const router = express.Router();
router.use(adminAuth);

// ─── GET: 사용자 목록 ───
router.get('/', async (req, res) => {
  try {
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

    res.json({
      users: profiles || [],
      pending: pending || [],
      pendingSignups: pendingSignups || [],
    });
  } catch (err) {
    safeError(res, err, '사용자 목록 조회');
  }
});

// ─── POST: 초대 / 승인 / 거부 (action 기반) ───
router.post('/', async (req, res) => {
  const { action, email, role = 'user' } = req.body;
  if (!action) return res.status(400).json({ error: 'action이 필요합니다.' });

  try {
    if (action === 'invite') {
      if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
      }

      const { error: insertErr } = await supabase
        .from('allowed_emails')
        .upsert({
          email: email.toLowerCase(),
          invited_at: new Date().toISOString(),
          invited_by: req.userId !== 'dev-admin' ? req.userId : null,
          registered: false,
        }, { onConflict: 'email' });
      if (insertErr) throw insertErr;

      try {
        const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
        await supabase.auth.admin.inviteUserByEmail(email, {
          data: { role },
          redirectTo: `${siteUrl}/change-password`,
        });
      } catch (inviteErr) {
        console.log('초대 메일 발송 실패 (정상 — 이메일 설정 필요):', inviteErr.message);
      }

      return res.json({ success: true, message: `${email} 초대 완료` });
    }

    if (action === 'approve') {
      if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
      await supabase.from('pending_signups').update({
        status: 'approved', reviewed_by: req.userId, reviewed_at: new Date().toISOString(),
      }).eq('email', email).eq('status', 'pending');

      await supabase.from('allowed_emails').upsert({
        email: email.toLowerCase(), invited_at: new Date().toISOString(),
        invited_by: req.userId, registered: false,
      }, { onConflict: 'email' });

      return res.json({ success: true, message: `${email} 가입 승인 완료` });
    }

    if (action === 'reject') {
      if (!email) return res.status(400).json({ error: '이메일이 필요합니다.' });
      await supabase.from('pending_signups').update({
        status: 'rejected', reviewed_by: req.userId, reviewed_at: new Date().toISOString(),
      }).eq('email', email).eq('status', 'pending');

      return res.json({ success: true, message: `${email} 가입 거부 완료` });
    }

    return res.status(400).json({ error: `유효하지 않은 action: ${action}` });
  } catch (err) {
    safeError(res, err, action);
  }
});

// ─── PUT: 역할 변경 ({ id, role }) ───
router.put('/', async (req, res) => {
  try {
    const { id, role } = req.body;
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "역할은 'user' 또는 'admin'이어야 합니다." });
    }

    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, '역할 변경');
  }
});

// ─── DELETE: 계정 삭제 ({ id }) ───
router.delete('/', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    if (id === req.userId) {
      return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
    }

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, '계정 삭제');
  }
});

module.exports = router;
