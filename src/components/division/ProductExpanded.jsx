import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'
import { fmtBillion, fmtRatio, wonToEok } from '../../utils/formatters'
import { getMonths } from '../../utils/periodHelpers'

export default function ProductExpanded({
  productName, division, year, quarter, scData, field, mergeRules, filterFn,
}) {
  const { monthlyChart, costRateChart, cumulativeTable, yoyChart } = useMemo(() => {
    if (!scData?.data) return { monthlyChart: [], costRateChart: [], cumulativeTable: [], yoyChart: [] }

    // 품목 필터 함수
    function matchProduct(r) {
      if (filterFn) return filterFn(r)
      if (mergeRules?.[productName]) {
        return mergeRules[productName].includes(r[field])
      }
      return r[field] === productName
    }

    const divData = scData.data.filter((r) => r.division === division && matchProduct(r))

    // 월별 매출/원가 (당기 vs 전년)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const monthly = months.map((m) => {
      const cur = divData.filter((r) => r.year === year && r.month === m)
      const prev = divData.filter((r) => r.year === year - 1 && r.month === m)
      const curSales = wonToEok(cur.reduce((s, r) => s + (r.sales || 0), 0))
      const prevSales = wonToEok(prev.reduce((s, r) => s + (r.sales || 0), 0))
      const curCost = wonToEok(cur.reduce((s, r) => s + (r.cost || 0), 0))
      const prevCost = wonToEok(prev.reduce((s, r) => s + (r.cost || 0), 0))
      return {
        month: `${m}월`,
        당기매출: curSales > 0 ? +curSales.toFixed(1) : null,
        전년매출: prevSales > 0 ? +prevSales.toFixed(1) : null,
        당기원가율: curSales > 0 ? +((curCost / curSales) * 100).toFixed(1) : null,
        전년원가율: prevSales > 0 ? +((prevCost / prevSales) * 100).toFixed(1) : null,
        yoyDiff: curSales > 0 || prevSales > 0 ? +(curSales - prevSales).toFixed(1) : null,
      }
    })

    // 연도별 누계 테이블 (21년 ~ 당기)
    const maxMonth = quarter > 0 ? quarter * 3 : 12
    const cumYears = []
    for (let y = 2021; y <= year; y++) {
      const yearData = divData.filter((r) => r.year === y && r.month <= maxMonth)
      const sales = wonToEok(yearData.reduce((s, r) => s + (r.sales || 0), 0))
      const cost = wonToEok(yearData.reduce((s, r) => s + (r.cost || 0), 0))
      cumYears.push({
        year: y,
        label: quarter > 0 ? `${String(y).slice(2)}년 ${quarter}Q누계` : `${String(y).slice(2)}년`,
        sales,
        cost,
        costRate: sales > 0 ? cost / sales : null,
      })
    }

    return {
      monthlyChart: monthly,
      costRateChart: monthly,
      cumulativeTable: cumYears,
      yoyChart: monthly.filter((m) => m.yoyDiff != null),
    }
  }, [scData, division, year, quarter, productName, field, mergeRules, filterFn])

  return (
    <div className="bg-gray-50 border-t border-border px-4 py-3 space-y-4">
      {/* 월별 매출 추이 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">월별 매출 추이 (억원)</h4>
        <div className="h-44 md:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${fmtBillion(v)} 억원`]} />
              <Line type="monotone" dataKey="당기매출" stroke="#F5A623" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="전년매출" stroke="#999" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 월별 원가율 추이 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">월별 원가율 추이 (%)</h4>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costRateChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={45} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v}%`]} />
              <Line type="monotone" dataKey="당기원가율" stroke="#D32F2F" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="전년원가율" stroke="#999" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 연도별 누계 테이블 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">연도별 누계 실적</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-surface">
                <th className="px-3 py-1.5 text-left font-semibold">기간</th>
                <th className="px-3 py-1.5 text-right font-semibold">매출(억)</th>
                <th className="px-3 py-1.5 text-right font-semibold">원가(억)</th>
                <th className="px-3 py-1.5 text-right font-semibold">원가율</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeTable.map((row) => (
                <tr key={row.year} className="border-t border-gray-200">
                  <td className="px-3 py-1.5 font-medium">{row.label}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBillion(row.sales)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtBillion(row.cost)}</td>
                  <td className="px-3 py-1.5 text-right">{row.costRate != null ? fmtRatio(row.costRate) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 월별 전년동기비 차트 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">월별 전년동기비 증감 (억원)</h4>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yoyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v > 0 ? '+' : ''}${fmtBillion(v)} 억원`]} />
              <ReferenceLine y={0} stroke="#ccc" />
              <Bar dataKey="yoyDiff" radius={[2, 2, 0, 0]} barSize={20}>
                {yoyChart.map((entry, i) => (
                  <Cell key={i} fill={entry.yoyDiff >= 0 ? '#1565C0' : '#D32F2F'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
