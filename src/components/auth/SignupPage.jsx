/**
 * 회원가입 화면
 * - allowed_emails에 있는 이메일 → 바로 가입
 * - 없는 이메일 → 가입 신청 (관리자 승인 필요)
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}`

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [requestMode, setRequestMode] = useState(false) // 가입 신청 모드
  const [requestSent, setRequestSent] = useState(false) // 신청 완료
  const { signUp, checkAllowedEmail } = useAuth()

  function validateForm() {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return false
    }
    if (!displayName.trim()) {
      setError('이름을 입력해주세요.')
      return false
    }
    if (!requestMode) {
      if (password.length < 8) {
        setError('비밀번호는 8자 이상이어야 합니다.')
        return false
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError('비밀번호는 영문과 숫자를 모두 포함해야 합니다.')
        return false
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        return false
      }
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!validateForm()) return
    setLoading(true)

    try {
      // 허용 이메일 확인
      const allowed = await checkAllowedEmail(email)

      if (!allowed && !requestMode) {
        // 미승인 이메일 → 가입 신청 모드로 전환
        setRequestMode(true)
        setLoading(false)
        return
      }

      if (requestMode) {
        // 가입 신청 전송
        const res = await fetch(`${API_BASE}/api/signup-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            displayName: displayName.trim(),
            reason: reason.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (data.alreadyApproved) {
            // 이미 승인됨 → 일반 가입 모드로 복귀
            setRequestMode(false)
            setError('승인된 이메일입니다! 비밀번호를 설정하여 가입을 완료해주세요.')
          } else {
            setError(data.error)
          }
          setLoading(false)
          return
        }
        setRequestSent(true)
        setLoading(false)
        return
      }

      // 승인된 이메일 → 정상 가입
      await signUp(email, password, displayName.trim())
      setSuccess(true)
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('이미 가입된 이메일입니다.')
      } else {
        setError(err.message || '회원가입에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 가입 신청 완료
  if (requestSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">가입 신청 완료</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>{email}</strong>의 가입 신청이 접수되었습니다.<br />
            관리자 승인 후 가입이 가능합니다.
          </p>
          <Link to="/login" className="text-primary-dark text-sm hover:underline">
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  // 가입 성공 → 이메일 인증 안내
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">이메일 인증을 완료해주세요</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>{email}</strong>로 인증 메일을 발송했습니다.<br />
            메일함을 확인하고 인증 링크를 클릭해주세요.
          </p>
          <Link to="/login" className="text-primary-dark text-sm hover:underline">
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {requestMode ? '가입 신청' : '회원가입'}
          </h1>
          <p className="text-base text-gray-500 mt-1 tracking-[0.1em]" style={{ fontFamily: 'var(--font-display)' }}>Profit Review</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {requestMode && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
              등록되지 않은 이메일입니다. 아래 정보를 입력하면 관리자에게 가입 신청이 전달됩니다.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setRequestMode(false); setError(''); }}
                placeholder="name@example.com"
                required
                disabled={requestMode}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                  disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {requestMode ? (
              /* 가입 신청 모드: 사유 입력 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">신청 사유 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 경영기획팀, 성과발표 참석 목적"
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm resize-none
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            ) : (
              /* 일반 가입 모드: 비밀번호 */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상, 영문+숫자"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm
                      focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 확인"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm
                      focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm
                hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? (requestMode ? '신청 중...' : '가입 중...')
                : (requestMode ? '가입 신청' : '회원가입')
              }
            </button>
          </form>

          {requestMode && (
            <button
              onClick={() => { setRequestMode(false); setError(''); }}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 hover:underline"
            >
              다른 이메일로 가입하기
            </button>
          )}

          <div className="mt-5 text-center text-sm">
            <Link to="/login" className="text-gray-500 hover:underline">이미 계정이 있으신가요? 로그인</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
