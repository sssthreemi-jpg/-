/**
 * 관리자 대시보드 — 시스템 상태 요약 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

function StatCard({ label, value, sub, accent }) {
  const colors = {
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }
  const c = colors[accent] || colors.amber

  return (
    <div className={`bg-gradient-to-br ${c} rounded-2xl border p-4 md:p-5 transition-transform duration-200 hover:scale-[1.02]`}>
      <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-medium">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-white/90 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1.5">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [usage, setUsage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/usage')
      .then(setUsage)
      .catch((e) => setError(e.message))
  }, [])

  const pct = usage?.usagePercent || 0
  const barColor = pct > 80 ? 'from-red-500 to-rose-500' : pct > 50 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'

  return (
    <div>
      <h2 className="text-xl font-bold text-white/90 mb-6 tracking-tight">System Overview</h2>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* ═══ 상태 카드 ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard accent="green" label="Claude API" value="Online" sub="Sonnet 4.6" />
        <StatCard accent="blue" label="Database" value="Online" sub="Supabase PostgreSQL" />
        <StatCard
          accent="amber"
          label="이번 달 비용"
          value={usage ? `$${usage.totalCost}` : '--'}
          sub={usage ? `상한 $${usage.costLimit}` : ''}
        />
        <StatCard
          accent="purple"
          label="이번 달 질문"
          value={usage ? `${usage.totalRequests}` : '--'}
          sub={usage ? `평균 $${usage.avgCostPerRequest}/건` : ''}
        />
      </div>

      {/* ═══ 비용 프로그레스 ═══ */}
      {usage && (
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 md:p-6 mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-xs text-white/30 mb-1">월간 비용 사용률</div>
              <div className="text-3xl font-bold text-white/90 tracking-tight">{pct}%</div>
            </div>
            <div className="text-right text-xs text-white/30">
              ${usage.totalCost} / ${usage.costLimit}
            </div>
          </div>
          <div className="relative w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full opacity-50 blur-sm`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ═══ 토큰 요약 ═══ */}
      {usage && (
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
            <div className="text-[11px] uppercase tracking-wider text-white/30 mb-2">Input Tokens</div>
            <div className="text-2xl font-bold text-white/80">{(usage.totalInputTokens / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
            <div className="text-[11px] uppercase tracking-wider text-white/30 mb-2">Output Tokens</div>
            <div className="text-2xl font-bold text-white/80">{(usage.totalOutputTokens / 1000).toFixed(0)}K</div>
          </div>
        </div>
      )}
    </div>
  )
}
