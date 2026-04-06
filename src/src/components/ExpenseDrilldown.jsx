import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useData } from '../hooks/useData'
import { fmtBillion } from '../utils/formatters'

const BIZ_COLORS = {
  ETC: '#F5A623', CH: '#4CAF50', 건기식: '#2196F3', 나보타: '#9C27B0',
  글로벌: '#FF5722', 수탁: '#607D8B', 기타: '#795548', 공통: '#9E9E9E',
  홍보: '#00BCD4', 제외: '#BDBDBD',
}

/**
 * 비용 세부항목 드릴다운 패널 (expense_detail.json 기반)
 *
 * Props:
 *   category2  - 구분2 (영업판관비 등)
 *   label      - 표시 라벨
 *   year, months - 기간
 *   onClose    - 닫기
 */
export default function ExpenseDrilldown({ category2, label, year, months, onClose }) {
  const { data, loading } = useData('/data/expense_detail.json')
  const [selectedCat3, setSelectedCat3] = useState(null)

  // ── 구분3별 집계 ──
  const { cat3Rows, cat3Total } = useMemo(() => {
    if (!data) return { cat3Rows: [], cat3Total: 0 }

    function aggregate(yr) {
      const filtered = data.data.filter(
        (r) => r.year === yr && months.includes(r.month) && r.category2 === category2,
      )
      const groups = {}
      filtered.forEach((r) => {
        const c3 = r.category3 || '(기타)'
        if (!groups[c3]) groups[c3] = { total: 0, direct: 0, common: 0, byBiz: {} }
        const amt = r.amount || 0
        groups[c3].total += amt
        const biz = r.bizUnit || '(미분류)'
        if (biz === '공통') {
          groups[c3].common += amt
        } else {
          groups[c3].direct += amt
        }
        groups[c3].byBiz[biz] = (groups[c3].byBiz[biz] || 0) + amt
      })
      return groups
    }

    const cur = aggregate(year)
    const prev = aggregate(year - 1)

    const rows = Object.entries(cur)
      .map(([name, v]) => {
        const p = prev[name]
        return {
          name,
          total: v.total / 1e8,
          direct: v.direct / 1e8,
          common: v.common / 1e8,
          directRatio: v.total ? v.direct / v.total : null,
          prevTotal: p ? p.total / 1e8 : 0,
          diff: (v.total - (p?.total || 0)) / 1e8,
          byBiz: v.byBiz,
          prevByBiz: p?.byBiz || {},
        }
      })
      .filter((r) => Math.abs(r.total) > 0.001)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    const total = rows.reduce((s, r) => s + r.total, 0)
    return { cat3Rows: rows, cat3Total: total }
  }, [data, category2, year, months])

  // ── 선택된 구분3의 사업구분별 ──
  const bizRows = useMemo(() => {
    if (!selectedCat3 || !data) return []

    function aggregate(yr) {
      const filtered = data.data.filter(
        (r) => r.year === yr && months.includes(r.month)
          && r.category2 === category2 && r.category3 === selectedCat3,
      )
      const groups = {}
      filtered.forEach((r) => {
        const biz = r.bizUnit || '(미분류)'
        groups[biz] = (groups[biz] || 0) + (r.amount || 0)
      })
      return groups
    }

    const cur = aggregate(year)
    const prev = aggregate(year - 1)

    return Object.entries(cur)
      .map(([biz, amt]) => ({
        biz,
        amount: amt / 1e8,
        prevAmount: (prev[biz] || 0) / 1e8,
        diff: (amt - (prev[biz] || 0)) / 1e8,
        isCommon: biz === '공통',
      }))
      .filter((r) => Math.abs(r.amount) > 0.001)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [data, category2, selectedCat3, year, months])

  if (loading) return <div className="text-center py-10 text-gray-400">로딩 중...</div>

  // 차트 데이터
  const chartData = cat3Rows.slice(0, 10).map((r) => ({
    name: r.name.length > 8 ? r.name.slice(0, 7) + '…' : r.name,
    fullName: r.name,
    value: Math.round(r.total * 10) / 10,
  }))

  return (
    <div className="border border-border rounded-xl bg-white overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white">
        <h3 className="font-bold text-base">
          {label} 세부항목 (RAW(E) 기반)
        </h3>
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="p-4 space-y-5">
        {/* ── 구분3별 바차트 ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">구분3 세부항목 (억원)</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v, _, props) => [`${fmtBillion(v)} 억원`, props.payload.fullName]}
                />
                <Bar dataKey="value" fill="#F5A623" radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F5A623' : i < 3 ? '#FFB74D' : '#FFE0B2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 구분3별 테이블 ── */}
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left font-semibold">세부항목 (구분3)</th>
                <th className="px-3 py-2 text-right font-semibold">금액</th>
                <th className="px-3 py-2 text-right font-semibold">직접</th>
                <th className="px-3 py-2 text-right font-semibold">공통</th>
                <th className="px-3 py-2 text-right font-semibold">전년</th>
                <th className="px-3 py-2 text-right font-semibold">증감</th>
              </tr>
            </thead>
            <tbody>
              {cat3Rows.map((row) => (
                <tr
                  key={row.name}
                  className={`border-t border-border/60 cursor-pointer hover:bg-primary-light/50 transition-colors ${
                    selectedCat3 === row.name ? 'bg-primary-light' : ''
                  }`}
                  onClick={() => setSelectedCat3(selectedCat3 === row.name ? null : row.name)}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="flex items-center gap-1">
                      {row.name}
                      <span className="text-gray-300 text-xs">▸</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{fmtBillion(row.total)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{fmtBillion(row.direct)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmtBillion(row.common)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmtBillion(row.prevTotal)}</td>
                  <td className={`px-3 py-2 text-right ${row.diff > 0 ? 'text-decrease' : row.diff < 0 ? 'text-increase' : ''}`}>
                    {Math.abs(row.diff) > 0.05 ? `${row.diff > 0 ? '+' : ''}${fmtBillion(row.diff)}` : '-'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-3 py-2">합계</td>
                <td className="px-3 py-2 text-right">{fmtBillion(cat3Total)}</td>
                <td className="px-3 py-2 text-right">{fmtBillion(cat3Rows.reduce((s, r) => s + r.direct, 0))}</td>
                <td className="px-3 py-2 text-right">{fmtBillion(cat3Rows.reduce((s, r) => s + r.common, 0))}</td>
                <td className="px-3 py-2 text-right"></td>
                <td className="px-3 py-2 text-right"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 구분3 클릭 → 사업구분별 ── */}
        {selectedCat3 && bizRows.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {selectedCat3} — 사업구분별 내역 (억원)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 바차트 */}
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bizRows.map((r) => ({
                      name: r.biz,
                      value: Math.round(r.amount * 10) / 10,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `${fmtBillion(v)} 억원`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {bizRows.map((r) => (
                        <Cell key={r.biz} fill={BIZ_COLORS[r.biz] || '#999'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* 테이블 */}
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-1.5 text-left font-semibold">사업구분</th>
                      <th className="px-3 py-1.5 text-right font-semibold">금액</th>
                      <th className="px-3 py-1.5 text-right font-semibold">전년</th>
                      <th className="px-3 py-1.5 text-right font-semibold">증감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bizRows.map((r) => (
                      <tr key={r.biz} className="border-t border-border/50">
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: BIZ_COLORS[r.biz] || '#999' }}
                            />
                            {r.biz}
                            {r.isCommon && <span className="text-[10px] text-gray-400">(배부대상)</span>}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium">{fmtBillion(r.amount)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{fmtBillion(r.prevAmount)}</td>
                        <td className={`px-3 py-1.5 text-right ${r.diff > 0 ? 'text-decrease' : r.diff < 0 ? 'text-increase' : ''}`}>
                          {Math.abs(r.diff) > 0.05 ? `${r.diff > 0 ? '+' : ''}${fmtBillion(r.diff)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
