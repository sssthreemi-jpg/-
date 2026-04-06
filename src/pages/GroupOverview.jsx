/**
 * 그룹 종합 페이지 — Profit-Drilldown 디자인 기반
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCompany, slugify } from '../contexts/CompanyContext'
import { fmt, fmtGrowth, growthClass, fmtInd } from '../utils/groupFormatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { COMPANY_COLORS } from '../data/companiesRegistry'

const CHART_COLORS = {
  revenue: ['#FDE8C8', '#FBCF8E', '#F5A623', '#E09000'],
  profit: ['#C8E6C9', '#A5D6A7', '#66BB6A', '#2E7D32'],
}

function SummaryCard({ label, value, sub, highlight }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${highlight ? 'border-primary' : 'border-gray-200'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1 text-gray-900">{value}</div>
      {sub && <div className={`text-sm mt-1 ${sub.className || 'text-gray-500'}`}>{sub.text}</div>}
    </div>
  )
}

function GrowthBadge({ value }) {
  if (value == null) return <span className="text-gray-400">-</span>
  const cls = value >= 0 ? 'bg-blue-50 text-increase' : 'bg-red-50 text-decrease'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{fmtGrowth(value)}</span>
}

export default function GroupOverview() {
  const { companies, subsidiaries, affiliates } = useCompany()
  const [tab, setTab] = useState('all')

  const allCompanies = companies
  const displayList = tab === 'all' ? allCompanies
    : tab === 'subsidiary' ? subsidiaries : affiliates

  const totals = useMemo(() => {
    const tr25 = allCompanies.reduce((s, c) => s + (c.revenue?.y25 || 0), 0)
    const tr24 = allCompanies.reduce((s, c) => s + (c.revenue?.y24 || 0), 0)
    const to25 = allCompanies.reduce((s, c) => s + (c.operatingProfit?.y25 || 0), 0)
    const to24 = allCompanies.reduce((s, c) => s + (c.operatingProfit?.y24 || 0), 0)
    const sr = subsidiaries.reduce((s, c) => s + (c.revenue?.y25 || 0), 0)
    const ar = affiliates.reduce((s, c) => s + (c.revenue?.y25 || 0), 0)
    return {
      tr25, tr24, to25, to24, sr, ar,
      rg: tr24 ? (tr25 - tr24) / tr24 : null,
      og: to24 ? (to25 - to24) / Math.abs(to24) : null,
      opm: tr25 ? to25 / tr25 : null,
    }
  }, [allCompanies, subsidiaries, affiliates])

  const trendData = useMemo(() =>
    ['y22', 'y23', 'y24', 'y25'].map((yr, i) => ({
      name: ['22년', '23년', '24년', '25년'][i],
      매출: allCompanies.reduce((s, c) => s + (c.revenue?.[yr] || 0), 0),
      영업이익: allCompanies.reduce((s, c) => s + (c.operatingProfit?.[yr] || 0), 0),
    })),
    [allCompanies]
  )

  const revenueRank = useMemo(() =>
    [...allCompanies]
      .sort((a, b) => (b.revenue?.y25 || 0) - (a.revenue?.y25 || 0))
      .slice(0, 10)
      .map((c, i) => ({ name: c.name, value: c.revenue?.y25 || 0, fill: COMPANY_COLORS[i] })),
    [allCompanies]
  )

  const pieData = useMemo(() => [
    { name: '계열사', value: totals.sr, fill: '#F5A623' },
    { name: '관계사', value: totals.ar, fill: '#607D8B' },
  ], [totals])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">2025년 대웅그룹 손익 종합</h2>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <SummaryCard
          label="그룹 총 매출액"
          value={fmt(totals.tr25) + ' 억원'}
          sub={{ text: '전년比 ' + fmtGrowth(totals.rg), className: growthClass(totals.rg) }}
        />
        <SummaryCard
          label="그룹 총 영업이익"
          value={fmt(totals.to25) + ' 억원'}
          sub={{ text: '전년比 ' + fmtGrowth(totals.og), className: growthClass(totals.og) }}
          highlight
        />
        <SummaryCard
          label="평균 영업이익률"
          value={totals.opm != null ? (totals.opm * 100).toFixed(1) + '%' : '-'}
        />
        <SummaryCard
          label="계열사 매출"
          value={fmt(totals.sr) + ' 억원'}
          sub={{ text: '전체의 ' + (totals.tr25 ? ((totals.sr / totals.tr25) * 100).toFixed(1) + '%' : '-') }}
        />
        <SummaryCard
          label="관계사 매출"
          value={fmt(totals.ar) + ' 억원'}
          sub={{ text: '전체의 ' + (totals.tr25 ? ((totals.ar / totals.tr25) * 100).toFixed(1) + '%' : '-') }}
        />
        <SummaryCard
          label="법인 수"
          value={allCompanies.length + '개사'}
          sub={{ text: '계열 ' + subsidiaries.length + ' + 관계 ' + affiliates.length }}
        />
      </div>

      {/* 차트 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">그룹 전체 매출 추이 (억원)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="매출" radius={[6, 6, 0, 0]}>
                {trendData.map((_, i) => <Cell key={i} fill={CHART_COLORS.revenue[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">그룹 전체 영업이익 추이 (억원)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="영업이익" radius={[6, 6, 0, 0]}>
                {trendData.map((_, i) => <Cell key={i} fill={CHART_COLORS.profit[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">25년 회사별 매출 TOP 10</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueRank} layout="vertical" margin={{ left: 70 }}>
              <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={65} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {revenueRank.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">계열사 / 관계사 매출 비중 (25년)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              >
                {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 전체 법인 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-primary text-white px-5 py-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">전체 법인 손익 요약</h3>
          <div className="flex gap-1">
            {[
              { key: 'all', label: '전체' },
              { key: 'subsidiary', label: '계열사' },
              { key: 'affiliate', label: '관계사' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tab === t.key ? 'bg-white text-primary' : 'text-white/70 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-light">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">회사명</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">그룹</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">22년</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">23년</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">24년</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 bg-highlight">25년 매출</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">성장률</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 bg-highlight">25년 영업이익</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">OPM</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700">26년 목표</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map(c => {
                const opm = c.revenue?.y25 && c.operatingProfit?.y25
                  ? c.operatingProfit.y25 / c.revenue.y25 : null
                return (
                  <tr key={c.name} className="border-b border-border-light hover:bg-highlight/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link to={`/company/${slugify(c.name)}`} className="font-semibold text-primary-dark hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.group === '계열사그룹' ? 'bg-primary-light text-primary-dark' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.group === '계열사그룹' ? '계열' : '관계'}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 text-gray-500">{fmt(c.revenue?.y22)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-500">{fmt(c.revenue?.y23)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-500">{fmt(c.revenue?.y24)}</td>
                    <td className="text-right px-3 py-2.5 font-bold text-gray-900 bg-highlight/30">{fmt(c.revenue?.y25)}</td>
                    <td className="text-right px-3 py-2.5"><GrowthBadge value={c.revenueGrowth?.y25} /></td>
                    <td className={`text-right px-3 py-2.5 font-bold bg-highlight/30 ${
                      (c.operatingProfit?.y25 || 0) >= 0 ? 'text-increase' : 'text-decrease'
                    }`}>{fmt(c.operatingProfit?.y25)}</td>
                    <td className="text-right px-3 py-2.5">{opm != null ? <GrowthBadge value={opm} /> : '-'}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400">{fmt(c.revenue?.target26)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
