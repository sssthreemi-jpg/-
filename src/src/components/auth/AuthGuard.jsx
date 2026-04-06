/**
 * 인증 상태 체크 래퍼 — 미인증 시 /login으로 리다이렉트
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthGuard() {
  const { user, loading } = useAuth()

  // 로딩 중: 스피너 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 미인증: 로그인 페이지로
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 인증됨: 자식 라우트 렌더링
  return <Outlet />
}
