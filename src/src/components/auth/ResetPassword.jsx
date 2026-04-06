/**
 * 비밀번호 재설정 요청 화면
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || '재설정 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">재설정 링크 발송 완료</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>{email}</strong>로 비밀번호 재설정 링크를 발송했습니다.<br />
            메일함을 확인해주세요.
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
          <h1 className="text-xl font-bold text-gray-900">비밀번호 재설정</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-4">
            가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@daewoong.co.kr"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm
                hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? '발송 중...' : '재설정 링크 발송'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:underline">로그인으로 돌아가기</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
