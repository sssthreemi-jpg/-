/**
 * 사용자별 질문 통계 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function UserStats() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState([])
  const [totals, setTotals] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/stats?year=${year}&month=${month}`)
      .then((d) => { setStats(d.stats || []); setTotals(d.totals || null) })
      .catch((e) => setError(e.message))
  }, [year, month])

  function formatDate(d) {
    if (!d) return '-'
    const diff = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
    if (diff < 1) return '오늘'
    if (diff < 2) return '어제'
    return `${Math.floor(diff)}일 전`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white/90 tracking-tight">사용자별 통계</h2>
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

      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium">사용자</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-white/30 font-medium">질문 수</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-white/30 font-medium">토큰</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-white/30 font-medium">비용</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-white/30 font-medium">마지막 사용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.map((u, i) => (
                <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/15 flex items-center justify-center text-[11px] font-bold text-amber-400">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white/75">{u.display_name}</div>
                        <div className="text-[11px] text-white/25 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white/60 tabular-nums">{u.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs text-white/40 tabular-nums">
                    {((u.input_tokens + u.output_tokens) / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white/75 tabular-nums">${u.cost}</td>
                  <td className="px-4 py-3 text-right text-xs text-white/30">{formatDate(u.last_used)}</td>
                </tr>
              ))}

              {totals && (
                <tr className="border-t-2 border-amber-500/20 bg-amber-500/[0.03]">
                  <td className="px-4 py-3 font-bold text-amber-400/80">합계</td>
                  <td className="px-4 py-3 text-right font-bold text-white/75 tabular-nums">{totals.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-white/50 tabular-nums">
                    {((totals.input_tokens + totals.output_tokens) / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white/75 tabular-nums">${totals.cost}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
