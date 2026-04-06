/**
 * 로그인 화면 — 2분할 레이아웃 (좌: 브랜딩, 우: 폼)
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.')
      } else {
        setError(err.message || '로그인에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── 좌측: 브랜딩 영역 (모바일 숨김) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-dark text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* 엠블럼 꽉 차게 배경으로 */}
        <img
          src="/assets/ci/3. 대웅_엠블럼.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain opacity-[0.12] brightness-0 invert p-12"
        />

        <div className="relative z-10">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            삶의 질 향상을 선도하는<br />
            글로벌 헬스케어 그룹
          </h1>
          <p className="text-white/80 text-base xl:text-lg leading-relaxed max-w-md">
            이 곳은 경영 성과를 한눈에 파악하고 필요시 원하는 대로<br />
            상세 데이터를 탐색할 수 있는 대시보드입니다.
          </p>
        </div>

        {/* 하단 CI 텍스트 */}
        <div className="relative z-10">
          <span className="text-white/60 text-sm tracking-widest">DAEWOONG PHARMACEUTICAL</span>
        </div>
      </div>

      {/* ── 우측: 로그인 폼 ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* 폼 카드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
            {/* CI 헤더 */}
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/assets/ci/3. 대웅_엠블럼.png"
                alt=""
                className="w-11 h-11 object-contain"
              />
              <div className="leading-none">
                <p className="text-xl font-bold text-gray-800 tracking-[0.08em]">DAEWOONG</p>
                <p className="text-[10px] text-gray-400 tracking-[0.12em] mt-1">PHARMACEUTICAL CO.,LTD.</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">로그인</h2>
              <p className="text-sm text-gray-500 mt-1">Profit Review에 접속합니다</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm animate-slide-down">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">아이디를 입력하세요</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@daewoong.co.kr"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                    placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호를 입력하세요</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                    placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm
                  hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-3 text-sm">
              <Link to="/signup" className="text-primary-dark hover:underline font-medium">회원가입</Link>
              <span className="text-gray-300">|</span>
              <Link to="/reset-password" className="text-gray-400 hover:underline">비밀번호 찾기</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
