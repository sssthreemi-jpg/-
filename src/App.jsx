import { lazy, Suspense, Component } from 'react'
import { Routes, Route } from 'react-router-dom'
import { BreakpointProvider } from './hooks/useBreakpoint'
import GroupLayout from './components/GroupLayout'
import Layout from './components/Layout'

// 그룹 레벨 페이지
const GroupOverview = lazy(() => import('./pages/GroupOverview'))
const GroupComparison = lazy(() => import('./pages/GroupComparison'))
const CompanyAnnual = lazy(() => import('./pages/CompanyAnnual'))
const CompanyCards = lazy(() => import('./pages/CompanyCards'))
const CompanyPresentation = lazy(() => import('./pages/CompanyPresentation'))
const AlertDashboard = lazy(() => import('./pages/AlertDashboard'))

// 상세 페이지 (기존 Profit-Drilldown)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CompanySummary = lazy(() => import('./pages/CompanySummary'))
const DivisionPL = lazy(() => import('./pages/DivisionPL'))
const CostRateAnalysis = lazy(() => import('./pages/CostRateAnalysis'))
const ExpenseAnalysis = lazy(() => import('./pages/ExpenseAnalysis'))

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
            className="text-[#1a237e] underline text-sm"
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
  return (
    <BreakpointProvider>
      <Routes>
        {/* 그룹 레벨 페이지 */}
        <Route element={<GroupLayout />}>
          <Route path="/" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><GroupOverview /></Suspense></ErrorBoundary>} />
          <Route path="/comparison" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><GroupComparison /></Suspense></ErrorBoundary>} />
          <Route path="/companies" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CompanyCards /></Suspense></ErrorBoundary>} />
          <Route path="/presentation" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CompanyPresentation /></Suspense></ErrorBoundary>} />
          <Route path="/alerts" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><AlertDashboard /></Suspense></ErrorBoundary>} />
          <Route path="/company/:companyId" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CompanyAnnual /></Suspense></ErrorBoundary>} />
        </Route>

        {/* 상세 분석 페이지 (대웅제약 등 상세 데이터 보유 법인) */}
        <Route path="/company/:companyId/detail" element={<Layout />}>
          <Route index element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Dashboard /></Suspense></ErrorBoundary>} />
          <Route path="pl" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CompanySummary /></Suspense></ErrorBoundary>} />
          <Route path="division" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><DivisionPL /></Suspense></ErrorBoundary>} />
          <Route path="cost" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CostRateAnalysis /></Suspense></ErrorBoundary>} />
          <Route path="expense" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><ExpenseAnalysis /></Suspense></ErrorBoundary>} />
        </Route>
      </Routes>
    </BreakpointProvider>
  )
}
