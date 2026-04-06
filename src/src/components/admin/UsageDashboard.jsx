/**
 * API 사용량 대시보드 — 월간 비용 + 일별 차트 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { adminFetch } from './adminApi'

export default function UsageDashboard() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/usage?year=${year}&month=${month}`)
      .then(setSummary)
      .catch((e) => setError(e.message))
    adminFetch(`/usage?type=daily&year=${year}&month=${month}`)
      .then((d) => setDaily(d.daily || []))
      .catch(() => {})
  }, [year, month])

  const pct = summary?.usagePercent || 0
  const barColor = pct > 80 ? 'from-red-500 to-rose-500' : pct > 50 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white/90 tracking-tight">API 사용량</h2>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(+e.target.value)}
            className="text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 focus:outline-none focus:border-amber-500/40">
            {[2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(+e.target.value)}
            className="text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 focus:outline-none focus:border-amber-500/40">
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}월</option>)}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: '이번 달 비용', value: `$${summary.totalCost}`, accent: 'amber' },
              { label: '비용 상한', value: `$${summary.costLimit}`, accent: 'blue' },
              { label: '총 요청 수', value: `${summary.totalRequests}회`, accent: 'purple' },
              { label: '평균 비용/건', value: `$${summary.avgCostPerRequest}`, accent: 'green' },
            ].map((card) => (
              <div key={card.label} className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                <div className="text-[11px] uppercase tracking-wider text-white/30 mb-1.5">{card.label}</div>
                <div className="text-xl font-bold text-white/85">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 mb-5">
            <div className="flex justify-between items-end mb-3">
              <div className="text-xs text-white/30">월간 사용률</div>
              <div className="text-xl font-bold text-white/85">{pct}%</div>
            </div>
            <div className="relative w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </>
      )}

      {daily.length > 0 && (
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
          <h3 className="text-xs font-semibold text-white/40 mb-4 uppercase tracking-wider">일별 사용량</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} tickFormatter={(d) => d.slice(8)} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} width={50} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <Tooltip
                  contentStyle={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}
                  formatter={(v) => [`$${v}`, '비용']}
                />
                <Bar dataKey="cost" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
