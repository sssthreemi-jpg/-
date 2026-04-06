/**
 * 그룹 레벨 레이아웃 — Profit-Drilldown 디자인 기반
 */
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useCompany, slugify } from '../contexts/CompanyContext'

const topNav = [
  { path: '/', label: '그룹 종합', short: '종합' },
  { path: '/companies', label: '회사별 상세', short: '상세' },
  { path: '/alerts', label: '주요 이슈', short: '이슈', alert: true },
]
const bottomNav = [
  { path: '/presentation', label: '회사별 발표', short: '발표' },
]

export default function GroupLayout() {
  const { subsidiaries, affiliates, loading } = useCompany()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-subtle font-sans">
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 bg-gray-900 text-white z-30 overflow-y-auto">
        <div className="px-5 py-4 bg-primary">
          <h1 className="text-2xl text-white tracking-[0.12em]" style={{ fontFamily: 'var(--font-display)' }}>
            대웅그룹
          </h1>
          <p className="text-[10px] text-white/60 tracking-widest uppercase mt-0.5">Group Performance Dashboard</p>
        </div>

        {/* 상단 메뉴: 그룹종합 → 비교분석 → 회사별상세 → 주요이슈 */}
        <nav className="p-3 space-y-1 border-b border-gray-700">
          {topNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? (item.alert ? 'bg-red-600 text-white' : 'bg-primary text-white')
                    : (item.alert ? 'text-red-400 hover:bg-red-900/30 font-bold' : 'text-gray-300 hover:bg-gray-800 hover:text-white')
                }`
              }
            >
              {item.alert ? '⚠ ' : ''}{item.label}
            </NavLink>
          ))}
        </nav>

        {/* 계열사 목록 */}
        <div className="px-3 pt-3">
          <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            계열사그룹 ({subsidiaries.length})
          </div>
          {subsidiaries.map(c => (
            <NavLink
              key={c.name}
              to={`/company/${slugify(c.name)}`}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-xs transition-colors ${
                  isActive ? 'bg-primary text-white font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {c.name}
            </NavLink>
          ))}
        </div>

        {/* 관계사 목록 */}
        <div className="px-3 pt-3 border-b border-gray-700 pb-3">
          <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            관계사그룹 ({affiliates.length})
          </div>
          {affiliates.map(c => (
            <NavLink
              key={c.name}
              to={`/company/${slugify(c.name)}`}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-xs transition-colors ${
                  isActive ? 'bg-primary text-white font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {c.name}
            </NavLink>
          ))}
        </div>

        {/* 하단 메뉴: 회사별 발표 */}
        <nav className="p-3 space-y-1">
          {bottomNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              🎤 {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 모바일 헤더 */}
      <header className="lg:hidden bg-primary text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg tracking-[0.1em]" style={{ fontFamily: 'var(--font-display)' }}>대웅그룹</h1>
        <nav className="flex gap-1">
          {[...topNav, ...bottomNav].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs font-medium ${
                  isActive ? 'bg-white/20' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {item.short}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pb-16 lg:pb-8 pt-3 pr-3 pl-3 sm:pt-4 sm:pr-4 sm:pl-4 lg:pt-6 lg:pr-6 lg:pl-[17rem]">
        <Outlet />
      </main>

      {/* 모바일 하단 탭 */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border flex z-30 pb-safe" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
        {[...topNav, ...bottomNav].map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center py-3 text-sm ${
                isActive ? 'text-primary font-bold' : 'text-gray-400'
              }`
            }
          >
            {item.short}
          </NavLink>
        ))}
        <NavLink
          to={`/company/${slugify(subsidiaries[0]?.name || '')}`}
          className={() =>
            `flex-1 flex items-center justify-center py-3 text-sm ${
              location.pathname.startsWith('/company') ? 'text-primary font-bold' : 'text-gray-400'
            }`
          }
        >
          법인별
        </NavLink>
      </nav>
    </div>
  )
}
