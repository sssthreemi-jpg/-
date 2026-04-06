/**
 * 법인별 연간 뷰 — Profit-Drilldown 디자인 기반
 */
import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCompany, unslugify } from '../contexts/CompanyContext'
import { getCapabilities } from '../data/companiesRegistry'
import { fmt, fmtGrowth, growthClass, fmtInd } from '../utils/groupFormatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const COL = 'w-[15%] min-w-[80px]'
const COL_LABEL = 'w-[25%] min-w-[140px]'

function PLRow({ label, data, highlight }) {
  return (
    <tr className={`border-b border-border-light ${highlight ? 'bg-highlight font-semibold' : 'hover:bg-surface-subtle'}`}>
      <td className={`px-4 py-2 text-left font-medium text-gray-700 ${COL_LABEL}`}>{label}</td>
      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmt(data?.y22)}</td>
      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmt(data?.y23)}</td>
      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmt(data?.y24)}</td>
      <td className={`px-3 py-2 text-right font-bold text-gray-900 tabular-nums ${COL}`}>{fmt(data?.y25)}</td>
      <td className={`px-3 py-2 text-right text-gray-400 tabular-nums ${COL}`}>{fmt(data?.target26)}</td>
    </tr>
  )
}

function IndicatorTable({ indicators, title, accent }) {
  const [open, setOpen] = useState(true)
  if (!indicators?.length) return null

  const grouped = useMemo(() => {
    const map = {}
    indicators.forEach(ind => {
      const cat = ind.category || '기타'
      if (!map[cat]) map[cat] = []
      map[cat].push(ind)
    })
    return Object.entries(map)
  }, [indicators])

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold flex justify-between items-center transition-colors ${
          accent === 'primary'
            ? 'bg-primary-light text-primary-dark hover:bg-primary-light/80'
            : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
        }`}
      >
        <span>{title} ({indicators.length}개)</span>
        <span className="text-xs opacity-60">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-1 bg-white rounded-lg shadow-sm overflow-hidden">
          {grouped.map(([cat, inds]) => (
            <div key={cat}>
              {grouped.length > 1 && (
                <div className="text-xs font-bold text-increase px-4 py-1.5 bg-blue-50/50 border-b border-blue-100">{cat}</div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-light">
                    <th className={`text-left px-4 py-2 font-semibold text-gray-700 ${COL_LABEL}`}>지표명</th>
                    <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>22년</th>
                    <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>23년</th>
                    <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>24년</th>
                    <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>25년</th>
                    <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>26년 목표</th>
                  </tr>
                </thead>
                <tbody>
                  {inds.map((ind, i) => (
                    <tr key={i} className="border-b border-border-light hover:bg-highlight/40">
                      <td className={`px-4 py-2 text-gray-600 font-medium ${COL_LABEL}`}>{ind.label}</td>
                      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmtInd(ind.values?.y22, ind.isRate)}</td>
                      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmtInd(ind.values?.y23, ind.isRate)}</td>
                      <td className={`px-3 py-2 text-right text-gray-500 tabular-nums ${COL}`}>{fmtInd(ind.values?.y24, ind.isRate)}</td>
                      <td className={`px-3 py-2 text-right font-semibold text-gray-900 tabular-nums ${COL}`}>{fmtInd(ind.values?.y25, ind.isRate)}</td>
                      <td className={`px-3 py-2 text-right text-gray-400 tabular-nums ${COL}`}>{fmtInd(ind.values?.target26, ind.isRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompanyAnnual() {
  const { companyId } = useParams()
  const { companies } = useCompany()
  const companyName = unslugify(companyId)
  const company = companies.find(c => c.name === companyName)
  const caps = getCapabilities(companyName)

  if (!company) {
    return <div className="text-center py-20 text-gray-400">회사를 찾을 수 없습니다: {companyName}</div>
  }

  const opm25 = company.revenue?.y25 && company.operatingProfit?.y25
    ? company.operatingProfit.y25 / company.revenue.y25 : null

  const chartData = ['y22', 'y23', 'y24', 'y25'].map((yr, i) => ({
    name: ['22년', '23년', '24년', '25년'][i],
    매출: company.revenue?.[yr] || 0,
    영업이익: company.operatingProfit?.[yr] || 0,
    영업이익률: company.revenue?.[yr] && company.operatingProfit?.[yr]
      ? (company.operatingProfit[yr] / company.revenue[yr]) * 100 : 0,
  }))

  return (
    <div>
      {/* 헤더 */}
      <div className="bg-primary rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="text-sm text-white/70 mt-1">{company.group} | 2025년 연간 실적 (단위: 억원)</p>
          </div>
          {caps.hasDetailedPL && (
            <Link
              to={`/company/${companyId}/detail`}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
            >
              심층 분석 →
            </Link>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: '매출액', value: fmt(company.revenue?.y25), sub: company.revenueGrowth?.y25 != null ? '전년比 ' + fmtGrowth(company.revenueGrowth.y25) : null },
            { label: '영업이익', value: fmt(company.operatingProfit?.y25), danger: (company.operatingProfit?.y25 || 0) < 0 },
            { label: '영업이익률', value: opm25 != null ? (opm25 * 100).toFixed(1) + '%' : '-' },
            { label: '26년 매출 목표', value: fmt(company.revenue?.target26) },
          ].map((kpi, i) => (
            <div key={i} className="bg-white/15 rounded-lg p-3 text-center backdrop-blur-sm">
              <div className="text-[10px] text-white/60 uppercase font-medium">{kpi.label}</div>
              <div className={`text-xl font-bold mt-1 ${kpi.danger ? 'text-red-200' : ''}`}>{kpi.value}</div>
              {kpi.sub && <div className="text-xs mt-0.5 text-white/80">{kpi.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">매출 추이</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="매출" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={['#FDE8C8', '#FBCF8E', '#F5A623', '#E09000'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">영업이익 추이</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="영업이익" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={['#C8E6C9', '#A5D6A7', '#66BB6A', '#2E7D32'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">영업이익률 추이</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => v.toFixed(0) + '%'} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => v.toFixed(1) + '%'} />
              <Line dataKey="영업이익률" stroke="#F5A623" strokeWidth={3} dot={{ r: 5, fill: '#F5A623' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 손익 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="bg-primary text-white px-5 py-3">
          <h3 className="text-base font-semibold">전사 손익 (억원)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-light">
                <th className={`text-left px-4 py-2 font-semibold text-gray-700 ${COL_LABEL}`}>구분</th>
                <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>22년</th>
                <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>23년</th>
                <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>24년</th>
                <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>25년</th>
                <th className={`text-right px-3 py-2 font-semibold text-gray-700 ${COL}`}>26년 목표</th>
              </tr>
            </thead>
            <tbody>
              <PLRow label="매출액" data={company.revenue} highlight />
              <PLRow label="매출원가" data={company.cogs} />
              <PLRow label="매출총이익" data={company.grossProfit} highlight />
              <PLRow label="판매관리비" data={company.sga} />
              {company.rnd && Object.values(company.rnd).some(v => v) && (
                <PLRow label="R&D비용" data={company.rnd} />
              )}
              <PLRow label="영업이익" data={company.operatingProfit} highlight />
            </tbody>
          </table>
        </div>
      </div>

      {/* 지표 */}
      <IndicatorTable indicators={company.commonIndicators} title="공통 지표" accent="primary" />
      <IndicatorTable indicators={company.individualIndicators} title="개별 지표" accent="orange" />
    </div>
  )
}
