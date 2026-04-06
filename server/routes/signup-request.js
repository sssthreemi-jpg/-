/**
 * 가입 신청 API (공개 — 인증 불필요)
 * POST /api/signup-request — 가입 신청 저장
 */
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 가입 신청은 IP당 시간당 5회로 엄격 제한 (스팸 방지)
const signupRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 5,
  message: { error: '가입 신청이 너무 많습니다. 1시간 후 다시 시도해주세요.' },
});

const router = express.Router();

router.post('/', signupRequestLimiter, async (req, res) => {
  try {
    const { email, displayName, reason } = req.body;

    // 입력 검증
    if (!email || !displayName) {
      return res.status(400).json({ error: '이메일과 이름은 필수입니다.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
    }
    if (displayName.length > 50) {
      return res.status(400).json({ error: '이름은 50자 이내로 입력해주세요.' });
    }
    if (reason && reason.length > 200) {
      return res.status(400).json({ error: '신청 사유는 200자 이내로 입력해주세요.' });
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
        // 거부된 경우 다시 신청 가능 → 상태 초기화
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

    // 신규 신청
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
    console.error('[SignupRequest] 오류:', err.message);
    const message = process.env.NODE_ENV === 'production'
      ? '가입 신청 처리 중 오류가 발생했습니다.'
      : err.message;
    res.status(500).json({ error: message });
  }
});

module.exports = router;
