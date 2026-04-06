/**
 * Vercel Serverless: POST /api/signup-request
 * 가입 신청 (공개 API)
 */
const { handlePreflight } = require('./_shared/cors');
const { supabase } = require('./_shared/supabase');

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, displayName, reason } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: '이메일과 이름은 필수입니다.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
    }
    if (!supabase) {
      return res.status(503).json({ error: '서비스를 사용할 수 없습니다.' });
    }

    // 이미 allowed_emails에 있는지 확인
    const { data: existing } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(400).json({
        error: '이미 승인된 이메일입니다. 회원가입 페이지에서 가입을 진행해주세요.',
        alreadyApproved: true,
      });
    }

    // 이미 신청했는지 확인
    const { data: pendingExist } = await supabase
      .from('pending_signups')
      .select('email, status')
      .eq('email', email.toLowerCase())
      .single();

    if (pendingExist) {
      if (pendingExist.status === 'pending') {
        return res.status(400).json({ error: '이미 가입 신청이 접수되었습니다. 관리자 승인을 기다려주세요.' });
      }
      if (pendingExist.status === 'rejected') {
        const { error } = await supabase
          .from('pending_signups')
          .update({
            display_name: displayName.trim(),
            reason: reason?.trim() || null,
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
            created_at: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase());
        if (error) throw error;
        return res.json({ success: true, message: '가입 신청이 다시 접수되었습니다.' });
      }
    }

    const { error } = await supabase
      .from('pending_signups')
      .insert({
        email: email.toLowerCase(),
        display_name: displayName.trim(),
        reason: reason?.trim() || null,
        status: 'pending',
      });
    if (error) throw error;

    res.json({ success: true, message: '가입 신청이 접수되었습니다. 관리자 승인 후 가입이 가능합니다.' });
  } catch (err) {
    console.error('[SignupRequest]', err.message);
    res.status(500).json({ error: '가입 신청 처리 중 오류가 발생했습니다.' });
  }
};
