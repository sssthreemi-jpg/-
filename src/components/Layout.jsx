import { NavLink, Outlet, Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PeriodProvider, usePeriod } from '../contexts/PeriodContext'
import { unslugify } from '../contexts/CompanyContext'

const navItems = [
  { path: '/', label: '대시보드', short: '홈' },
  { path: '/pl-detail', label: '전사 손익', short: '손익' },
  { path: '/division', label: '사업부별 손익', short: '사업부' },
  { path: '/cost', label: '원가 분석', short: '원가' },
  { path: '/expense', label: '비용 분석', short: '비용' },
]

const quarters = [
  { value: 1, label: '1Q' },
  { value: 2, label: '2Q' },
  { value: 3, label: '3Q' },
  { value: 4, label: '4Q' },
  { value: 0, label: '연간' },
]

function SidebarPeriodSelector() {
  const { year, quarter, years, setYear, setQuarter } = usePeriod()
  if (!years.length) return null
  return (
    <div className="px-3 py-3 border-b border-gray-700">
      <label htmlFor="sidebar-year" className="block text-xs uppercase tracking-wider text-gray-500 px-1 mb-2">기준 기간</label>
      <select
        id="sidebar-year"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg px-2.5 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
      <div className="grid grid-cols-4 gap-1">
        {quarters.slice(0, 4).map((q) => (
          <button
            key={q.value}
            onClick={() => setQuarter(q.value)}
            className={`py-2.5 rounded-md text-xs font-medium transition-colors ${
              quarter === q.value
                ? 'bg-primary text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setQuarter(0)}
        className={`w-full mt-1 py-2.5 rounded-md text-xs font-medium transition-colors ${
          quarter === 0
            ? 'bg-primary text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        연간
      </button>
    </div>
  )
}

function MobilePeriodSelector() {
  const { year, quarter, years, setYear, setQuarter } = usePeriod()
  if (!years.length) return null
  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="기준 연도"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="bg-white/20 text-white border-0 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[36px]"
      >
        {years.map((y) => (
          <option key={y} value={y} className="text-gray-900">{y}</option>
        ))}
      </select>
      <select
        aria-label="기준 분기"
        value={quarter}
        onChange={(e) => setQuarter(Number(e.target.value))}
        className="bg-white/20 text-white border-0 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[36px]"
      >
        {quarters.map((q) => (
          <option key={q.value} value={q.value} className="text-gray-900">{q.label}</option>
        ))}
      </select>
    </div>
  )
}

function LayoutInner() {
  const { profile, signOut } = useAuth()
  const { companyId } = useParams()
  const companyName = companyId ? unslugify(companyId) : '대웅제약'

  return (
    <div className="min-h-screen bg-surface-subtle font-sans">
      {/* ── 데스크탑 사이드바 ── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 bg-gray-900 text-white z-30">
        <div className="px-5 py-4 bg-primary">
          <Link to={`/company/${companyId || encodeURIComponent('대웅제약')}`} className="block">
            <h1 className="text-xl text-white font-bold">{companyName}</h1>
            <p className="text-[10px] text-white/60 tracking-widest uppercase mt-0.5">심층 분석</p>
          </Link>
        </div>

        {/* 기간 선택기 */}
        <SidebarPeriodSelector />

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 그룹 대시보드 돌아가기 */}
        <div className="p-3 border-t border-gray-700">
          <Link
            to="/"
            className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            ← 그룹 대시보드
          </Link>
        </div>
      </aside>

      {/* ── 모바일 상단 헤더 ── */}
      <header className="lg:hidden bg-primary text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg tracking-[0.1em]" style={{ fontFamily: 'var(--font-display)' }}>Profit Review</h1>
        <div className="flex items-center gap-3">
          <MobilePeriodSelector />
          <button
            onClick={() => signOut()}
            className="text-white/70 hover:text-white"
            aria-label="로그아웃"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="pb-16 lg:pb-8 pt-3 pr-3 pl-3 sm:pt-4 sm:pr-4 sm:pl-4 lg:pt-6 lg:pr-6 lg:pl-[17rem] relative">
        {/* 엠블럼 워터마크 */}
        <img
          src="/assets/ci/3. 대웅_엠블럼.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none fixed bottom-4 right-4 lg:bottom-8 lg:right-8 opacity-20 z-0 w-[200px] lg:w-[340px] h-auto"
        />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>

      {/* ── 모바일 하단 탭 ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border flex z-30 pb-safe" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-gray-400'
              }`
            }
          >
            <span className="text-sm leading-tight">{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function Layout() {
  return (
    <PeriodProvider>
      <LayoutInner />
    </PeriodProvider>
  )
}
