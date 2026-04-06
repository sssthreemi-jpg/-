import { useState, lazy, Suspense, Component } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import { BreakpointProvider } from './hooks/useBreakpoint'

// 라우트 레벨 코드 분할 — Recharts 포함 페이지 lazy load
const DivisionPL = lazy(() => import('./pages/DivisionPL'))
const CostRateAnalysis = lazy(() => import('./pages/CostRateAnalysis'))
const ExpenseAnalysis = lazy(() => import('./pages/ExpenseAnalysis'))
const CompanySummary = lazy(() => import('./pages/CompanySummary'))

// 챗봇 UI — 대부분 사용자가 열지 않으므로 lazy load (react-markdown ~50KB 절감)
const ChatButton = lazy(() => import('./components/chat/ChatButton'))
const ChatPanel = lazy(() => import('./components/chat/ChatPanel'))

// 인증 — 로그인 후에는 불필요, 초기 번들에서 제외
const LoginPage = lazy(() => import('./components/auth/LoginPage'))
const SignupPage = lazy(() => import('./components/auth/SignupPage'))
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'))
const ChangePassword = lazy(() => import('./components/auth/ChangePassword'))
import AuthGuard from './components/auth/AuthGuard'
import PwaInstallBanner from './components/ui/PwaInstallBanner'

// 관리자 — admin 역할만 접근, 초기 번들에서 제외
const AdminGuard = lazy(() => import('./components/admin/AdminGuard'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'))
const UserManagement = lazy(() => import('./components/admin/UserManagement'))
const UsageDashboard = lazy(() => import('./components/admin/UsageDashboard'))
const CostSettings = lazy(() => import('./components/admin/CostSettings'))
const ChatLogs = lazy(() => import('./components/admin/ChatLogs'))
const PromptEditor = lazy(() => import('./components/admin/PromptEditor'))
const Announcements = lazy(() => import('./components/admin/Announcements'))
const UserStats = lazy(() => import('./components/admin/UserStats'))

import { useAuth } from './contexts/AuthContext'

const PageFallback = () => (
  <div className="text-center py-20 text-gray-400">로딩 중...</div>
)

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-3">페이지를 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="text-primary underline text-sm"
          >
            새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const { user } = useAuth()

  return (
    <BreakpointProvider>
      <Routes>
        {/* 공개 라우트 (인증 불필요) */}
        <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<PageFallback />}><SignupPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>} />
        <Route path="/change-password" element={<Suspense fallback={<PageFallback />}><ChangePassword /></Suspense>} />

        {/* 보호 라우트 (인증 필요) */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pl-detail" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CompanySummary /></Suspense></ErrorBoundary>} />
            <Route path="/division" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><DivisionPL /></Suspense></ErrorBoundary>} />
            <Route path="/cost" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CostRateAnalysis /></Suspense></ErrorBoundary>} />
            <Route path="/expense" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><ExpenseAnalysis /></Suspense></ErrorBoundary>} />
          </Route>

          {/* 관리자 라우트 (admin 역할 필요) */}
          <Route element={<Suspense fallback={<PageFallback />}><AdminGuard /></Suspense>}>
            <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminLayout /></Suspense>}>
              <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<PageFallback />}><UserManagement /></Suspense>} />
              <Route path="usage" element={<Suspense fallback={<PageFallback />}><UsageDashboard /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageFallback />}><CostSettings /></Suspense>} />
              <Route path="logs" element={<Suspense fallback={<PageFallback />}><ChatLogs /></Suspense>} />
              <Route path="prompt" element={<Suspense fallback={<PageFallback />}><PromptEditor /></Suspense>} />
              <Route path="announcements" element={<Suspense fallback={<PageFallback />}><Announcements /></Suspense>} />
              <Route path="stats" element={<Suspense fallback={<PageFallback />}><UserStats /></Suspense>} />
            </Route>
          </Route>
        </Route>
      </Routes>

      {/* 챗봇 UI — 인증된 사용자에게만 표시 */}
      {user && (
        <Suspense fallback={null}>
          <ChatButton isOpen={chatOpen} onClick={() => setChatOpen(!chatOpen)} />
          <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </Suspense>
      )}
      {/* PWA 설치 유도 배너 */}
      <PwaInstallBanner />
    </BreakpointProvider>
  )
}
