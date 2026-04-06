/**
 * 관리자 페이지 레이아웃 — 모던 다크 사이드바 + Outlet
 */
import { NavLink, Outlet, Link } from 'react-router-dom'

const adminNav = [
  { path: '/admin', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1', end: true },
  { path: '/admin/users', label: '사용자 관리', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
  { path: '/admin/usage', label: 'API 사용량', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/admin/settings', label: '비용 설정', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' },
  { path: '/admin/logs', label: '대화 로그', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { path: '/admin/prompt', label: '시스템 프롬프트', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { path: '/admin/announcements', label: '공지사항', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { path: '/admin/stats', label: '사용자 통계', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

function NavIcon({ d }) {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* ═══ 상단 헤더 ═══ */}
      <header className="sticky top-0 z-30 bg-[#18181f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="font-bold text-sm text-white/90 tracking-tight">Admin Console</h1>
          </div>
          <Link
            to="/"
            className="text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            대시보드
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* ═══ 사이드 메뉴 (데스크탑) ═══ */}
        <aside className="hidden md:flex flex-col w-56 min-h-[calc(100vh-56px)] bg-[#14141a] border-r border-white/[0.06] p-3 flex-shrink-0">
          <nav className="space-y-0.5 flex-1">
            {adminNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`
                }
              >
                <NavIcon d={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* 하단 장식 */}
          <div className="mt-auto pt-4 px-3 pb-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/20 leading-relaxed">Profit Review Admin v1.0</p>
          </div>
        </aside>

        {/* ═══ 모바일 상단 탭 ═══ */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-[#14141a]/95 backdrop-blur-lg border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
          <div className="flex px-3 py-2 gap-1.5">
            {adminNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,166,35,0.2)]'
                      : 'text-white/35 hover:text-white/60 bg-white/[0.03]'
                  }`
                }
              >
                <NavIcon d={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* ═══ 콘텐츠 ═══ */}
        <main className="flex-1 p-4 md:p-8 mt-12 md:mt-0 min-h-[calc(100vh-56px)]">
          <div className="max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
