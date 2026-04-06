import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, LabelList,
} from 'recharts'
import { DIVISIONS, DIVISION_COLORS } from '../../utils/constants'
import { fmtDashboard } from './dashboardFormat'

const TABS = [
  { key: '전사', label: '전사' },
  ...DIVISIONS.map((d) => ({ key: d, label: d })),
]

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg border border-border px-3 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-gray-600">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {entry.dataKey === '매출' ? `${fmtDashboard(entry.value)}억` : `${entry.value}%`}
        </p>
      ))}
    </div>
  )
}

export default function QuarterlyTrendChart({ trendData }) {
  const [division, setDivision] = useState('전사')

  const chartData = useMemo(() => {
    if (!trendData?.length) return []
    return trendData.map((t) => {
      const div = t.agg?.[division] || {}
      const sales = div['매출'] ?? 0
      const cogs = div['매출원가'] ?? 0
      const op = div['영업이익'] ?? 0
      return {
        name: t.label,
        매출: Math.round(sales * 10) / 10,
        원가율: sales > 0 ? +((cogs / sales) * 100).toFixed(1) : 0,
        영업이익률: sales > 0 ? +((op / sales) * 100).toFixed(1) : 0,
      }
    })
  }, [trendData, division])

  if (!trendData?.length) return null

  const yTickFormatter = (v) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + '천'
    return v.toFixed(0)
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-4 lg:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-800">분기 추이</h3>
        <div role="tablist" aria-label="사업부 선택" className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={division === tab.key}
              onClick={() => setDivision(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                division === tab.key
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={
                division === tab.key
                  ? { backgroundColor: DIVISION_COLORS[tab.key] || '#F5A623' }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 lg:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 18, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#888' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              width={55}
              tickFormatter={yTickFormatter}
              label={{ value: '억원', position: 'insideTopLeft', offset: -5, fontSize: 11, fill: '#aaa' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => `${v}%`}
              label={{ value: '%', position: 'insideTopRight', offset: -5, fontSize: 11, fill: '#aaa' }}
            />
            <Tooltip content={<TrendTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="매출"
              stroke="#F5A623"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#F5A623' }}
              activeDot={{ r: 7, stroke: '#F5A623', strokeWidth: 2, fill: 'white' }}
              name="매출"
              animationDuration={1200}
            >
              <LabelList dataKey="매출" position="top" fontSize={11} fill="#F5A623" fontWeight={600} formatter={(v) => fmtDashboard(v)} />
            </Line>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="원가율"
              stroke="#EF5350"
              strokeWidth={2}
              dot={{ r: 3, fill: '#EF5350' }}
              activeDot={{ r: 7, stroke: '#EF5350', strokeWidth: 2, fill: 'white' }}
              strokeDasharray="5 3"
              name="원가율"
              animationDuration={1200}
            >
              <LabelList dataKey="원가율" position="bottom" fontSize={11} fill="#EF5350" fontWeight={600} formatter={(v) => `${v}%`} />
            </Line>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="영업이익률"
              stroke="#1565C0"
              strokeWidth={2}
              dot={{ r: 3, fill: '#1565C0' }}
              activeDot={{ r: 7, stroke: '#1565C0', strokeWidth: 2, fill: 'white' }}
              name="영업이익률"
              animationDuration={1200}
            >
              <LabelList dataKey="영업이익률" position="bottom" fontSize={11} fill="#1565C0" fontWeight={600} formatter={(v) => `${v}%`} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
