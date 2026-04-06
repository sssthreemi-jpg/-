import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, BarChart, Bar, ComposedChart, Cell, LabelList,
} from 'recharts'
import { useData } from '../hooks/useData'
import { usePeriod } from '../contexts/PeriodContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { DIVISIONS, DIVISION_COLORS } from '../utils/constants'
import { fmtBillion, fmtPercent } from '../utils/formatters'
import TableSkeleton from '../components/skeletons/TableSkeleton'

const ALL_DIVS = [...DIVISIONS, '전사']

export default function CostRateAnalysis() {
  const { data: plData, year, quarter, loading: plLoading } = usePeriod()
  const { data: scData, loading: scLoading } = useData('/data/sales_cost_summary.json')
  const loading = plLoading || scLoading

  const { isMobile } = useBreakpoint()
  const [selectedDiv, setSelectedDiv] = useState(null)
  const months = quarter === 0
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [quarter * 3 - 2, quarter * 3 - 1, quarter * 3]

  // ── 사업부별 원가율 테이블 ──
  const divRates = useMemo(() => {
    if (!plData) return []

    function getRates(yr) {
      const entries = plData.data.filter(
        (e) => e.type === '실적' && e.year === yr && months.includes(e.month),
      )
      if (!entries.length) return null
      const result = {}
      ALL_DIVS.forEach((div) => {
        const sales = entries.reduce((s, e) => s + (e.items?.[div]?.['매출'] ?? 0), 0)
        const cost = entries.reduce((s, e) => s + (e.items?.[div]?.['매출원가'] ?? 0), 0)
        result[div] = { sales, cost, rate: sales ? cost / sales : null }
      })
      return result
    }

    const cur = getRates(year)
    const prev = getRates(year - 1)
    if (!cur) return []

    return ALL_DIVS.map((div) => {
      const c = cur[div]
      const p = prev?.[div]
      return {
        div,
        sales: c.sales,
        cost: c.cost,
        rate: c.rate,
        prevRate: p?.rate ?? null,
        rateDiff: c.rate != null && p?.rate != null ? c.rate - p.rate : null,
      }
    })
  }, [plData, year, months])

  // ── 분기별 원가율 추이 (최근 8분기) ──
  const trendData = useMemo(() => {
    if (!plData) return []

    const quarters = []
    for (let y = year - 1; y <= year; y++) {
      for (let q = 1; q <= 4; q++) {
        quarters.push({ year: y, quarter: q })
      }
    }

    return quarters.map(({ year: y, quarter: q }) => {
      const ms = [q * 3 - 2, q * 3 - 1, q * 3]
      const entries = plData.data.filter(
        (e) => e.type === '실적' && e.year === y && ms.includes(e.month),
      )
      if (!entries.length) return null

      const point = { name: `${String(y).slice(2)}.${q}Q` }
      ALL_DIVS.forEach((div) => {
        const sales = entries.reduce((s, e) => s + (e.items?.[div]?.['매출'] ?? 0), 0)
        const cost = entries.reduce((s, e) => s + (e.items?.[div]?.['매출원가'] ?? 0), 0)
        point[div] = sales ? Math.round((cost / sales) * 1000) / 10 : null
      })
      return point
    }).filter(Boolean)
  }, [plData, year])

  // ── 선택 사업부 품목별 원가율 (S_C_raw) ──
  const productRates = useMemo(() => {
    if (!scData || !selectedDiv) return []

    function aggregate(yr) {
      const filtered = scData.data.filter(
        (r) => r.year === yr && months.includes(r.month) && r.division === selectedDiv,
      )
      const groups = {}
      filtered.forEach((r) => {
        const key = r.productGroup || '(기타)'
        if (!groups[key]) groups[key] = { sales: 0, cost: 0 }
        groups[key].sales += r.sales || 0
        groups[key].cost += r.cost || 0
      })
      return groups
    }

    const cur = aggregate(year)
    const prev = aggregate(year - 1)

    return Object.entries(cur)
      .map(([name, v]) => {
        const p = prev[name]
        const rate = v.sales ? v.cost / v.sales : null
        const prevRate = p && p.sales ? p.cost / p.sales : null
        return {
          name,
          sales: v.sales / 1e8,
          cost: v.cost / 1e8,
          rate,
          prevRate,
          rateDiff: rate != null && prevRate != null ? rate - prevRate : null,
        }
      })
      .filter((r) => Math.abs(r.sales) > 0.1)
      .sort((a, b) => Math.abs(b.sales) - Math.abs(a.sales))
  }, [scData, selectedDiv, year, months])

  if (loading) return <TableSkeleton rows={10} />

  const periodLabel = quarter === 0 ? `${year}년 연간` : `${year}년 ${quarter}Q`

  // 차트에 표시할 사업부 (전사 + 전체 사업부)
  const chartDivs = ['전사', 'ETC', 'CH', '건기식', '나보타', '글로벌', '수탁']

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">원가 분석</h2>

      {/* ════════ 분기별 원가율 추이 차트 ════════ */}
      <div className="card-section p-4 lg:p-5 mb-6">
        <h3 className="text-sm lg:text-base font-semibold text-gray-800 mb-3">
          분기별 원가율 추이 (%)
        </h3>
        <div className="h-56 md:h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: isMobile ? 11 : 13 }} />
              <YAxis
                tick={{ fontSize: 11 }} width={45} unit="%"
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => v != null ? `${v}%` : '-'}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {chartDivs.map((div) => (
                <Line
                  key={div}
                  type="monotone"
                  dataKey={div}
                  stroke={DIVISION_COLORS[div]}
                  strokeWidth={div === '전사' ? 2.5 : 1.5}
                  strokeDasharray={div === '전사' ? undefined : '4 2'}
                  dot={{ r: div === '전사' ? 4 : 2.5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ════════ 사업부별 원가율 바+라인 차트 ════════ */}
      {divRates.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            사업부별 원가율 비교 ({periodLabel}, %)
          </h3>
          <div className="h-52 md:h-60 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={divRates.filter((r) => r.div !== '기타').map((r) => ({
                  name: r.div,
                  당기: r.rate != null ? Math.round(r.rate * 1000) / 10 : null,
                  전년: r.prevRate != null ? Math.round(r.prevRate * 1000) / 10 : null,
                }))}
                margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={45} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="당기" name={`${year}년`} fill="#F5A623" radius={[3, 3, 0, 0]} barSize={22}>
                  <LabelList dataKey="당기" position="top" fontSize={11} fill="#F5A623" fontWeight={600} formatter={(v) => `${v}%`} />
                </Bar>
                <Bar dataKey="전년" name={`${year - 1}년`} fill="#E0E0E0" radius={[3, 3, 0, 0]} barSize={22}>
                  <LabelList dataKey="전년" position="top" fontSize={11} fill="#999" fontWeight={500} formatter={(v) => `${v}%`} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ════════ 사업부별 원가율 테이블 ════════ */}
      <div className="card-section overflow-hidden mb-6">
        <div className="px-4 lg:px-5 py-2.5 bg-gray-50 border-b border-border">
          <h3 className="text-sm lg:text-base font-semibold text-gray-800">
            사업부별 원가율 ({periodLabel})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th scope="col" className="px-3 lg:px-4 py-2 text-left font-semibold min-w-[80px] lg:min-w-[120px]">사업부</th>
                {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[90px] lg:min-w-[110px]">매출</th>}
                {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[90px] lg:min-w-[110px]">매출원가</th>}
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">원가율</th>
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">전년</th>
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">증감</th>
              </tr>
            </thead>
            <tbody>
              {divRates.map((row) => {
                const isTotal = row.div === '전사'
                const isSelected = selectedDiv === row.div
                return (
                  <tr
                    key={row.div}
                    className={`border-t border-border/60 transition-colors ${
                      isTotal
                        ? 'bg-gray-50 font-semibold'
                        : 'cursor-pointer hover:bg-primary-light'
                    } ${isSelected ? 'bg-primary-light' : ''}`}
                    onClick={() => !isTotal && setSelectedDiv(isSelected ? null : row.div)}
                  >
                    <td className="px-3 lg:px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: DIVISION_COLORS[row.div] }}
                        />
                        {row.div}
                        {!isTotal && <span className="text-gray-300 text-xs">▸</span>}
                      </span>
                    </td>
                    {!isMobile && <td className="px-3 lg:px-4 py-2 text-right">{fmtBillion(row.sales)}</td>}
                    {!isMobile && <td className="px-3 lg:px-4 py-2 text-right">{fmtBillion(row.cost)}</td>}
                    <td className="px-3 lg:px-4 py-2 text-right font-medium">{fmtPercent(row.rate)}</td>
                    <td className="px-3 lg:px-4 py-2 text-right text-gray-500">{fmtPercent(row.prevRate)}</td>
                    <td className={`px-3 lg:px-4 py-2 text-right font-medium ${
                      row.rateDiff != null
                        ? row.rateDiff > 0 ? 'text-decrease' : row.rateDiff < 0 ? 'text-increase' : ''
                        : ''
                    }`}>
                      {row.rateDiff != null
                        ? `${row.rateDiff > 0 ? '+' : ''}${(row.rateDiff * 100).toFixed(1)}%p`
                        : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ 선택 사업부 품목별 원가율 ════════ */}
      {selectedDiv && productRates.length > 0 && (
        <div className="card-section overflow-hidden">
          <div className="flex items-center justify-between px-4 lg:px-5 py-2.5 border-b border-border"
            style={{ backgroundColor: DIVISION_COLORS[selectedDiv] + '18' }}
          >
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedDiv} 품목별 원가율 ({periodLabel}, 매출 상위)
            </h3>
            <button
              onClick={() => setSelectedDiv(null)}
              aria-label="선택 초기화"
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >&times;</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100">
                  <th scope="col" className="px-3 lg:px-4 py-2 text-left font-semibold min-w-[120px] lg:min-w-[180px]">품목</th>
                  {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[85px] lg:min-w-[100px]">매출(억)</th>}
                  {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[85px] lg:min-w-[100px]">원가(억)</th>}
                  <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">원가율</th>
                  <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">전년</th>
                  <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">증감</th>
                </tr>
              </thead>
              <tbody>
                {productRates.slice(0, 20).map((row) => (
                  <tr key={row.name} className="border-t border-border/60">
                    <td className="px-3 lg:px-4 py-2 font-medium">{row.name}</td>
                    {!isMobile && <td className="px-3 lg:px-4 py-1.5 text-right">{fmtBillion(row.sales)}</td>}
                    {!isMobile && <td className="px-3 lg:px-4 py-1.5 text-right">{fmtBillion(row.cost)}</td>}
                    <td className="px-3 lg:px-4 py-2 text-right font-medium">{fmtPercent(row.rate)}</td>
                    <td className="px-3 lg:px-4 py-2 text-right text-gray-500">{fmtPercent(row.prevRate)}</td>
                    <td className={`px-3 lg:px-4 py-1.5 text-right ${
                      row.rateDiff != null
                        ? row.rateDiff > 0 ? 'text-decrease' : row.rateDiff < 0 ? 'text-increase' : ''
                        : ''
                    }`}>
                      {row.rateDiff != null
                        ? `${row.rateDiff > 0 ? '+' : ''}${(row.rateDiff * 100).toFixed(1)}%p`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {productRates.length > 20 && (
            <p className="text-xs text-gray-400 px-4 py-2 border-t border-border">
              상위 20개 품목 표시 (전체 {productRates.length}개)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
