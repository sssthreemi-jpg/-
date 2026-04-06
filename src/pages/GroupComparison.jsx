/**
 * 비교 분석 페이지 — 버블/산점도/추이 비교 차트
 */
import { useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { fmt, fmtGrowth } from '../utils/groupFormatters'
import { COMPANY_COLORS } from '../data/companiesRegistry'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, CartesianGrid,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-xs">
      <div className="font-bold mb-1">{d.name}</div>
      {d.revenue != null && <div>매출: {fmt(d.revenue)} 억원</div>}
      {d.opm != null && <div>영업이익률: {(d.opm * 100).toFixed(1)}%</div>}
      {d.revGrowth != null && <div>매출성장률: {fmtGrowth(d.revGrowth)}</div>}
      {d.opGrowth != null && <div>영업이익성장률: {fmtGrowth(d.opGrowth)}</div>}
    </div>
  )
}

export default function GroupComparison() {
  const { companies } = useCompany()

  // 버블 차트: 매출 vs 영업이익률 (버블 크기 = 매출규모)
  const bubbleData = useMemo(() => {
    return companies
      .filter(c => c.revenue?.y25 && c.operatingProfit?.y25)
      .map((c, i) => ({
        name: c.name,
        revenue: c.revenue.y25,
        opm: c.operatingProfit.y25 / c.revenue.y25,
        z: Math.sqrt(c.revenue.y25) * 3,
        color: COMPANY_COLORS[i % COMPANY_COLORS.length],
      }))
  }, [companies])

  // 산점도: 매출성장률 vs 영업이익성장률
  const growthData = useMemo(() => {
    return companies
      .filter(c => c.revenueGrowth?.y25 != null && c.opGrowth?.y25 != null)
      .map((c, i) => ({
        name: c.name,
        revGrowth: c.revenueGrowth.y25,
        opGrowth: c.opGrowth.y25,
        revenue: c.revenue?.y25 || 0,
        color: COMPANY_COLORS[i % COMPANY_COLORS.length],
      }))
  }, [companies])

  // 4개년 매출 추이 (주요 법인 8개)
  const trendData = useMemo(() => {
    const top8 = [...companies]
      .sort((a, b) => (b.revenue?.y25 || 0) - (a.revenue?.y25 || 0))
      .slice(0, 8)
    return ['y22', 'y23', 'y24', 'y25'].map((yr, i) => {
      const row = { name: ['22년', '23년', '24년', '25년'][i] }
      top8.forEach(c => { row[c.name] = c.revenue?.[yr] || 0 })
      return row
    })
  }, [companies])

  const top8Names = useMemo(() =>
    [...companies].sort((a, b) => (b.revenue?.y25 || 0) - (a.revenue?.y25 || 0)).slice(0, 8).map(c => c.name),
    [companies]
  )

  // 4개년 영업이익률 추이
  const opmTrendData = useMemo(() => {
    const top8 = [...companies]
      .sort((a, b) => (b.revenue?.y25 || 0) - (a.revenue?.y25 || 0))
      .slice(0, 8)
    return ['y22', 'y23', 'y24', 'y25'].map((yr, i) => {
      const row = { name: ['22년', '23년', '24년', '25년'][i] }
      top8.forEach(c => {
        const rev = c.revenue?.[yr]
        const op = c.operatingProfit?.[yr]
        row[c.name] = rev && op ? ((op / rev) * 100) : null
      })
      return row
    })
  }, [companies])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">비교 분석</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 매출 vs 영업이익률 버블 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">매출액 vs 영업이익률</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="revenue" name="매출" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} label={{ value: '매출 (억원)', position: 'bottom', fontSize: 11 }} />
              <YAxis dataKey="opm" name="영업이익률" tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fontSize: 11 }} />
              <ZAxis dataKey="z" range={[40, 400]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={bubbleData}>
                {bubbleData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* 매출성장률 vs 영업이익성장률 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">매출 성장률 vs 영업이익 성장률</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="revGrowth" tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fontSize: 11 }} label={{ value: '매출 성장률', position: 'bottom', fontSize: 11 }} />
              <YAxis dataKey="opGrowth" tickFormatter={v => (v * 100).toFixed(0) + '%'} tick={{ fontSize: 11 }} label={{ value: '영업이익 성장률', angle: -90, position: 'left', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={growthData}>
                {growthData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.7} r={8} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* 4개년 매출 추이 비교 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">4개년 매출 추이 비교 (주요 법인)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {top8Names.map((name, i) => (
                <Line key={name} dataKey={name} stroke={COMPANY_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 4개년 영업이익률 추이 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">4개년 영업이익률 추이 비교</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={opmTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => v?.toFixed(1) + '%'} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {top8Names.map((name, i) => (
                <Line key={name} dataKey={name} stroke={COMPANY_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
