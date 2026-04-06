import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtRatio, deltaClass } from '../../utils/formatters'
import { fmtDashboard, fmtDashboardDelta } from './dashboardFormat'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import KpiSparkline from './KpiSparkline'

const cards = [
  {
    label: '매출',
    key: '매출',
    color: '#F5A623',
    getValue: (agg) => agg?.['매출'],
    getDelta: (cur, prev) => (cur?.['매출'] ?? 0) - (prev?.['매출'] ?? 0),
    formatDelta: fmtDashboardDelta,
    formatValue: (v) => fmtDashboard(v),
    unit: '억',
    invertColor: false,
    getSubLabel: (agg, prevAgg) => {
      const cur = agg?.['매출']
      const prev = prevAgg?.['매출']
      if (!cur || !prev) return null
      const growth = ((cur - prev) / Math.abs(prev)) * 100
      return `전년동기比 ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
    },
  },
  {
    label: '매출원가',
    key: '매출원가',
    color: '#EF5350',
    getValue: (agg) => agg?.['매출원가'],
    getDelta: (cur, prev) => (cur?.['매출원가'] ?? 0) - (prev?.['매출원가'] ?? 0),
    formatDelta: fmtDashboardDelta,
    formatValue: (v) => fmtDashboard(v),
    unit: '억',
    invertColor: true,
    getSubLabel: (agg) => {
      const rate = agg?.['매출'] ? agg['매출원가'] / agg['매출'] : null
      return rate != null ? `원가율 ${fmtRatio(rate)}` : null
    },
  },
  {
    label: '영업이익',
    key: '영업이익',
    color: '#1565C0',
    getValue: (agg) => agg?.['영업이익'],
    getDelta: (cur, prev) => (cur?.['영업이익'] ?? 0) - (prev?.['영업이익'] ?? 0),
    formatDelta: fmtDashboardDelta,
    formatValue: (v) => fmtDashboard(v),
    unit: '억',
    invertColor: false,
    getSubLabel: (agg) => {
      const rate = agg?.['매출'] ? agg['영업이익'] / agg['매출'] : null
      return rate != null ? `영업이익률 ${fmtRatio(rate)}` : null
    },
  },
]

function AnimatedValue({ value, formatFn }) {
  const animated = useAnimatedNumber(value ?? 0)
  return <>{formatFn(animated)}</>
}

export default function EnhancedKpiCards({ curAgg, prevAgg, trendData }) {
  const navigate = useNavigate()

  const sparklines = useMemo(() => {
    if (!trendData?.length) return {}
    const result = {}
    cards.forEach((card) => {
      result[card.key] = trendData.map((t) => ({
        value: t.agg?.['전사']?.[card.key] ?? 0,
      }))
    })
    return result
  }, [trendData])

  const cur = curAgg?.['전사']
  const prev = prevAgg?.['전사']

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-4">
      {cards.map((card) => {
        const value = card.getValue(cur)
        const delta = card.getDelta(cur, prev)
        const colorClass = card.invertColor ? deltaClass(-delta) : deltaClass(delta)
        const subLabel = card.getSubLabel(cur, prev)

        const prevVal = card.getValue(prev)
        const pct = prevVal ? ((value - prevVal) / Math.abs(prevVal)) * 100 : null
        const pctStr = pct != null
          ? `${pct >= 0 ? '(+)' : '(-)'}${Math.abs(pct).toFixed(0)}% YoY`
          : null

        return (
          <div
            key={card.label}
            onClick={() => navigate('/pl-detail')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/pl-detail') } }}
            className="kpi-card rounded-2xl cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1 lg:mb-2">
              <p className="text-xs lg:text-base font-bold text-gray-500">{card.label}</p>
              <span className="text-[10px] lg:text-xs text-gray-300 hidden lg:inline">자세히 →</span>
            </div>

            {/* 데스크탑 */}
            <div className="hidden lg:flex items-end justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-4xl font-bold text-gray-900 tracking-tight leading-none">
                  <AnimatedValue value={value} formatFn={card.formatValue} />
                  <span className="text-xl font-semibold text-gray-900">억</span>
                </p>
                {subLabel && (
                  <p className="text-xs text-gray-400 mt-1">{subLabel}</p>
                )}
                {pctStr && (
                  <p className={`text-sm font-semibold mt-1.5 ${colorClass}`}>{pctStr}</p>
                )}
              </div>
              <KpiSparkline data={sparklines[card.key]} color={card.color} />
            </div>

            {/* 모바일 */}
            <div className="lg:hidden">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                <AnimatedValue value={value} formatFn={card.formatValue} />
                <span className="text-sm font-semibold">억</span>
              </p>
              {pctStr && (
                <p className={`text-[11px] font-semibold mt-1 ${colorClass}`}>{pctStr}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
