/**
 * 비용 상한 설정 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function CostSettings() {
  const [costLimit, setCostLimit] = useState(50)
  const [warningThreshold, setWarningThreshold] = useState(80)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/settings')
      .then((settings) => {
        if (settings.monthly_cost_limit) setCostLimit(settings.monthly_cost_limit.value?.usd || 50)
        if (settings.cost_warning_threshold) setWarningThreshold(settings.cost_warning_threshold.value?.percent || 80)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    setError('')
    try {
      await adminFetch('/settings', {
        method: 'PUT',
        body: { key: 'monthly_cost_limit', value: { usd: parseFloat(costLimit) } },
      })
      await adminFetch('/settings', {
        method: 'PUT',
        body: { key: 'cost_warning_threshold', value: { percent: parseInt(warningThreshold) } },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-amber-500/40 transition-colors'

  return (
    <div>
      <h2 className="text-xl font-bold text-white/90 mb-6 tracking-tight">비용 설정</h2>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">설정이 저장되었습니다.</div>}

      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6 space-y-6 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">월간 비용 상한 (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input type="number" value={costLimit} onChange={(e) => setCostLimit(e.target.value)} step="1" min="0" className={`${inputCls} pl-8`} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">경고 임계값 (%)</label>
          <input type="number" value={warningThreshold} onChange={(e) => setWarningThreshold(e.target.value)} step="5" min="0" max="100" className={inputCls} />
          <p className="text-[11px] text-white/20 mt-2">이 비율에 도달하면 관리자에게 알림</p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
        >
          {loading ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  )
}
