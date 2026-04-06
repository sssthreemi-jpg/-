import { useMemo } from 'react'
import { aggregate } from '../../utils/periodHelpers'

const METRICS = [
  { key: '매출', label: '매출' },
  { key: '매출총이익', label: '매출총이익' },
  { key: '영업이익', label: '영업이익' },
]

function growthRate(cur, prev) {
  if (!prev || prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

function fmtGrowth(v) {
  if (v == null) return '-'
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(1) + '%'
}

function growthColor(v) {
  if (v == null || v === 0) return 'text-gray-400'
  return v > 0 ? 'text-increase' : 'text-decrease'
}

export default function YoyGrowthTable({ data, effectiveYear, effectiveQuarter }) {
  const years = useMemo(() => {
    if (!data?.data) return []
    // 최근 3개년 (당기 포함)
    return [effectiveYear - 2, effectiveYear - 1, effectiveYear]
  }, [data, effectiveYear])

  const aggs = useMemo(() => {
    if (!data?.data) return {}
    const result = {}
    // 비교를 위해 4개년 필요 (3개년 + 그 전년)
    for (let y = effectiveYear - 3; y <= effectiveYear; y++) {
      result[y] = aggregate(data.data, y, effectiveQuarter)
    }
    return result
  }, [data, effectiveYear, effectiveQuarter])

  const shortYear = (y) => String(y).slice(2)

  return (
    <div className="bg-white border border-border rounded-2xl p-4 lg:p-5 shadow-sm h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">YoY 성장률</h3>
      <table className="w-full text-xs lg:text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 text-gray-500 font-medium">항목</th>
            {years.map((y) => (
              <th key={y} className="text-right py-2 text-gray-500 font-medium px-2">
                {effectiveQuarter > 0 ? `${shortYear(y)}.${effectiveQuarter}Q` : `${shortYear(y)}년`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((metric) => (
            <tr key={metric.key} className="border-b border-gray-100 last:border-b-0">
              <td className="py-2.5 font-medium text-gray-700">{metric.label}</td>
              {years.map((y) => {
                const cur = aggs[y]?.['전사']?.[metric.key]
                const prev = aggs[y - 1]?.['전사']?.[metric.key]
                const rate = growthRate(cur, prev)
                return (
                  <td key={y} className={`text-right py-2.5 px-2 font-semibold ${growthColor(rate)}`}>
                    {fmtGrowth(rate)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
