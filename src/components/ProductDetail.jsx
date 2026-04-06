import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid,
} from 'recharts'
import { fmtBillion, fmtPercent } from '../utils/formatters'

/**
 * 품목 상세 패널 — 월별 추이 차트 + 전년비 + 품목코드 드릴다운
 *
 * Props:
 *   productGroup - 품목구분 이름 (e.g. "펙수클루")
 *   division     - 사업부 (e.g. "ETC")
 *   drillPath    - 현재 드릴 경로 (필터용)
 *   year         - 선택 연도
 *   scData       - sales_cost_summary.json 데이터
 *   onClose      - 닫기 콜백
 */
export default function ProductDetail({
  productGroup, division, drillPath, year, scData, onClose,
}) {
  const [showRawCodes, setShowRawCodes] = useState(false)
  const [rawData, setRawData] = useState(null)
  const [rawLoading, setRawLoading] = useState(false)

  // ── 월별 매출/원가 데이터 (당해 + 전년) ──
  const { monthlyChart, monthlyTable } = useMemo(() => {
    if (!scData) return { monthlyChart: [], monthlyTable: [] }

    function getMonthly(yr) {
      let filtered = scData.data.filter(
        (r) => r.year === yr && r.division === division,
      )
      drillPath.forEach(({ field, value }) => {
        filtered = filtered.filter((r) => r[field] === value)
      })
      filtered = filtered.filter((r) => r.productGroup === productGroup)

      const byMonth = {}
      for (let m = 1; m <= 12; m++) byMonth[m] = { sales: 0, cost: 0 }
      filtered.forEach((r) => {
        byMonth[r.month].sales += r.sales || 0
        byMonth[r.month].cost += r.cost || 0
      })
      return byMonth
    }

    const cur = getMonthly(year)
    const prev = getMonthly(year - 1)

    const chart = []
    const table = []
    for (let m = 1; m <= 12; m++) {
      const cs = cur[m].sales / 1e8
      const cc = cur[m].cost / 1e8
      const ps = prev[m].sales / 1e8
      const pc = prev[m].cost / 1e8
      const curRate = cur[m].sales ? cur[m].cost / cur[m].sales : null
      const prevRate = prev[m].sales ? prev[m].cost / prev[m].sales : null

      chart.push({
        month: `${m}월`,
        [`${year} 매출`]: Math.round(cs * 10) / 10,
        [`${year - 1} 매출`]: Math.round(ps * 10) / 10,
        [`${year} 원가율`]: curRate != null ? Math.round(curRate * 1000) / 10 : null,
        [`${year - 1} 원가율`]: prevRate != null ? Math.round(prevRate * 1000) / 10 : null,
      })

      table.push({
        month: m,
        sales: cs,
        cost: cc,
        costRate: curRate,
        prevSales: ps,
        prevCost: pc,
        prevCostRate: prevRate,
        salesDiff: cs - ps,
      })
    }
    return { monthlyChart: chart, monthlyTable: table }
  }, [scData, division, drillPath, productGroup, year])

  // ── 품목코드 로딩 (on-demand) ──
  async function loadRawCodes() {
    if (rawData) {
      setShowRawCodes(true)
      return
    }
    setRawLoading(true)
    try {
      const res = await fetch('/data/sales_cost_raw.json')
      const json = await res.json()

      // 해당 품목의 품목코드별 집계
      let filtered = json.data.filter(
        (r) => r.division === division && r.productGroup === productGroup,
      )
      drillPath.forEach(({ field, value }) => {
        filtered = filtered.filter((r) => r[field] === value)
      })

      // 당해/전년 집계
      const codes = {}
      filtered.forEach((r) => {
        const code = r.productCode || '(코드없음)'
        if (!codes[code]) codes[code] = { cur: 0, curCost: 0, prev: 0, prevCost: 0 }
        if (r.year === year) {
          codes[code].cur += r.sales || 0
          codes[code].curCost += r.cost || 0
        } else if (r.year === year - 1) {
          codes[code].prev += r.sales || 0
          codes[code].prevCost += r.cost || 0
        }
      })

      const rows = Object.entries(codes)
        .map(([code, v]) => ({
          code,
          sales: v.cur / 1e8,
          cost: v.curCost / 1e8,
          costRate: v.cur ? v.curCost / v.cur : null,
          prevSales: v.prev / 1e8,
          salesDiff: (v.cur - v.prev) / 1e8,
        }))
        .filter((r) => Math.abs(r.sales) > 0.001 || Math.abs(r.prevSales) > 0.001)
        .sort((a, b) => Math.abs(b.sales) - Math.abs(a.sales))

      setRawData(rows)
      setShowRawCodes(true)
    } catch (e) {
      console.error('품목코드 로딩 실패:', e)
    } finally {
      setRawLoading(false)
    }
  }

  // 연간 합계
  const totals = useMemo(() => {
    const s = monthlyTable.reduce((a, r) => a + r.sales, 0)
    const c = monthlyTable.reduce((a, r) => a + r.cost, 0)
    const ps = monthlyTable.reduce((a, r) => a + r.prevSales, 0)
    return { sales: s, cost: c, costRate: s ? c / s : null, prevSales: ps, diff: s - ps }
  }, [monthlyTable])

  return (
    <div className="border border-border rounded-xl bg-white overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-white">
        <h3 className="font-bold text-base">{productGroup} 상세</h3>
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="p-4 space-y-6">
        {/* ── 매출 추이 차트 ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">월별 매출 추이 (억원)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone" dataKey={`${year} 매출`}
                  stroke="#F5A623" strokeWidth={2} dot={{ r: 3 }}
                />
                <Line
                  type="monotone" dataKey={`${year - 1} 매출`}
                  stroke="#999" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 원가율 추이 차트 ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">원가율 추이 (%)</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={45} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => v != null ? `${v}%` : '-'} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone" dataKey={`${year} 원가율`}
                  stroke="#D32F2F" strokeWidth={2} dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone" dataKey={`${year - 1} 원가율`}
                  stroke="#999" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 월별 테이블 ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">전년동기비 (억원)</h4>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1.5 text-left font-semibold">월</th>
                  <th className="px-2 py-1.5 text-right font-semibold">매출</th>
                  <th className="px-2 py-1.5 text-right font-semibold">전년</th>
                  <th className="px-2 py-1.5 text-right font-semibold">증감</th>
                  <th className="px-2 py-1.5 text-right font-semibold">원가</th>
                  <th className="px-2 py-1.5 text-right font-semibold">원가율</th>
                  <th className="px-2 py-1.5 text-right font-semibold">전년</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTable.map((r) => {
                  const rateDiff = r.costRate != null && r.prevCostRate != null
                    ? r.costRate - r.prevCostRate : null
                  return (
                    <tr key={r.month} className="border-t border-border/50">
                      <td className="px-2 py-1">{r.month}월</td>
                      <td className="px-2 py-1 text-right">{fmtBillion(r.sales)}</td>
                      <td className="px-2 py-1 text-right text-gray-400">{fmtBillion(r.prevSales)}</td>
                      <td className={`px-2 py-1 text-right ${r.salesDiff > 0 ? 'text-increase' : r.salesDiff < 0 ? 'text-decrease' : ''}`}>
                        {r.salesDiff !== 0 ? `${r.salesDiff > 0 ? '+' : ''}${fmtBillion(r.salesDiff)}` : '-'}
                      </td>
                      <td className="px-2 py-1 text-right">{fmtBillion(r.cost)}</td>
                      <td className="px-2 py-1 text-right">{fmtPercent(r.costRate)}</td>
                      <td className={`px-2 py-1 text-right ${
                        rateDiff != null ? (rateDiff > 0 ? 'text-decrease' : 'text-increase') : ''
                      }`}>
                        {rateDiff != null ? `${rateDiff > 0 ? '+' : ''}${(rateDiff * 100).toFixed(1)}%p` : '-'}
                      </td>
                    </tr>
                  )
                })}
                {/* 합계 */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-2 py-1">합계</td>
                  <td className="px-2 py-1 text-right">{fmtBillion(totals.sales)}</td>
                  <td className="px-2 py-1 text-right text-gray-400">{fmtBillion(totals.prevSales)}</td>
                  <td className={`px-2 py-1 text-right ${totals.diff > 0 ? 'text-increase' : totals.diff < 0 ? 'text-decrease' : ''}`}>
                    {totals.diff !== 0 ? `${totals.diff > 0 ? '+' : ''}${fmtBillion(totals.diff)}` : '-'}
                  </td>
                  <td className="px-2 py-1 text-right">{fmtBillion(totals.cost)}</td>
                  <td className="px-2 py-1 text-right">{fmtPercent(totals.costRate)}</td>
                  <td className="px-2 py-1 text-right"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 품목코드 상세 버튼 ── */}
        <div>
          <button
            onClick={loadRawCodes}
            disabled={rawLoading}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {rawLoading ? '로딩 중...' : showRawCodes ? '품목코드 상세 닫기' : '품목코드 상세 보기'}
          </button>
          {showRawCodes && (
            <button
              onClick={() => setShowRawCodes(false)}
              className="ml-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-800"
            >
              닫기
            </button>
          )}
        </div>

        {/* ── 품목코드 테이블 ── */}
        {showRawCodes && rawData && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              품목코드별 매출/원가 ({year}년 연간, 억원)
            </h4>
            <div className="overflow-x-auto border border-border rounded-lg max-h-80 overflow-y-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="sticky top-0">
                  <tr className="bg-gray-800 text-white">
                    <th className="px-2 py-1.5 text-left font-semibold">품목코드</th>
                    <th className="px-2 py-1.5 text-right font-semibold">매출</th>
                    <th className="px-2 py-1.5 text-right font-semibold">원가</th>
                    <th className="px-2 py-1.5 text-right font-semibold">원가율</th>
                    <th className="px-2 py-1.5 text-right font-semibold">전년매출</th>
                    <th className="px-2 py-1.5 text-right font-semibold">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {rawData.map((r) => (
                    <tr key={r.code} className="border-t border-border/50 hover:bg-gray-50">
                      <td className="px-2 py-1 font-mono">{r.code}</td>
                      <td className="px-2 py-1 text-right">{fmtBillion(r.sales)}</td>
                      <td className="px-2 py-1 text-right">{fmtBillion(r.cost)}</td>
                      <td className="px-2 py-1 text-right">{fmtPercent(r.costRate)}</td>
                      <td className="px-2 py-1 text-right text-gray-400">{fmtBillion(r.prevSales)}</td>
                      <td className={`px-2 py-1 text-right ${r.salesDiff > 0 ? 'text-increase' : r.salesDiff < 0 ? 'text-decrease' : ''}`}>
                        {Math.abs(r.salesDiff) > 0.001 ? `${r.salesDiff > 0 ? '+' : ''}${fmtBillion(r.salesDiff)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1">{rawData.length}개 품목코드</p>
          </div>
        )}
      </div>
    </div>
  )
}
