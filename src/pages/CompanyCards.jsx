/**
 * 회사별 상세 — 전 법인 카드 뷰 (원본 tab-detail 포팅)
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompany, slugify } from '../contexts/CompanyContext'
import { fmt, fmtGrowth, growthClass, fmtInd } from '../utils/groupFormatters'

function IndicatorBlock({ indicators, title, accent }) {
  const [open, setOpen] = useState(false)
  if (!indicators?.length) return null

  const grouped = {}
  indicators.forEach(ind => {
    const cat = ind.category || '기타'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ind)
  })

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)}
        className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold flex justify-between items-center ${accent}`}>
        <span>{title} ({indicators.length}개)</span>
        <span className="opacity-50 text-[10px]">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="mt-1">
          {Object.entries(grouped).map(([cat, inds]) => (
            <div key={cat}>
              {Object.keys(grouped).length > 1 && (
                <div className="text-[10px] font-bold text-increase px-2 py-1 border-b border-blue-100">{cat}</div>
              )}
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface">
                    <th className="text-left px-2 py-1 font-medium text-gray-500">지표</th>
                    <th className="text-right px-1.5 py-1 font-medium text-gray-500">22</th>
                    <th className="text-right px-1.5 py-1 font-medium text-gray-500">23</th>
                    <th className="text-right px-1.5 py-1 font-medium text-gray-500">24</th>
                    <th className="text-right px-1.5 py-1 font-medium text-gray-500">25</th>
                  </tr>
                </thead>
                <tbody>
                  {inds.map((ind, i) => (
                    <tr key={i} className="border-b border-border-light">
                      <td className="px-2 py-1 text-gray-600">{ind.label}</td>
                      <td className="text-right px-1.5 py-1 text-gray-400">{fmtInd(ind.values?.y22, ind.isRate)}</td>
                      <td className="text-right px-1.5 py-1 text-gray-400">{fmtInd(ind.values?.y23, ind.isRate)}</td>
                      <td className="text-right px-1.5 py-1 text-gray-400">{fmtInd(ind.values?.y24, ind.isRate)}</td>
                      <td className="text-right px-1.5 py-1 font-semibold">{fmtInd(ind.values?.y25, ind.isRate)}</td>
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

function CompanyCard({ c }) {
  const opm = c.revenue?.y25 && c.operatingProfit?.y25
    ? c.operatingProfit.y25 / c.revenue.y25 : null
  const isAff = c.group === '관계사그룹'

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`px-4 py-3 text-white flex justify-between items-center ${
        isAff ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-primary-dark to-primary'
      }`}>
        <Link to={`/company/${slugify(c.name)}`} className="font-semibold hover:underline">{c.name}</Link>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{isAff ? '관계사' : '계열사'}</span>
      </div>
      <div className="p-4">
        <div className="flex justify-between py-1.5 border-b border-border-light text-sm">
          <span className="text-gray-500">매출액 (25년)</span>
          <span className="font-semibold">{fmt(c.revenue?.y25)} 억원
            {c.revenueGrowth?.y25 != null && (
              <span className={`ml-1.5 text-xs ${growthClass(c.revenueGrowth.y25)}`}>{fmtGrowth(c.revenueGrowth.y25)}</span>
            )}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-border-light text-sm">
          <span className="text-gray-500">영업이익 (25년)</span>
          <span className={`font-semibold ${(c.operatingProfit?.y25 || 0) >= 0 ? 'text-increase' : 'text-decrease'}`}>
            {fmt(c.operatingProfit?.y25)} 억원
          </span>
        </div>
        {c.grossProfit?.y25 != null && (
          <div className="flex justify-between py-1.5 border-b border-border-light text-sm">
            <span className="text-gray-500">매출총이익</span>
            <span className="font-medium">{fmt(c.grossProfit?.y25)} 억원</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 border-b border-border-light text-sm">
          <span className="text-gray-500">영업이익률</span>
          <span className="font-medium">{opm != null ? (opm * 100).toFixed(1) + '%' : '-'}</span>
        </div>
        {c.revenue?.target26 && (
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-gray-500">26년 매출 목표</span>
            <span className="font-medium text-gray-400">{fmt(c.revenue.target26)} 억원</span>
          </div>
        )}
        <IndicatorBlock indicators={c.commonIndicators} title="공통 지표" accent="bg-primary-light text-primary-dark" />
        <IndicatorBlock indicators={c.individualIndicators} title="개별 지표" accent="bg-orange-50 text-orange-700" />
      </div>
    </div>
  )
}

export default function CompanyCards() {
  const { companies, subsidiaries, affiliates } = useCompany()
  const [filter, setFilter] = useState('all')
  const [allOpen, setAllOpen] = useState(false)

  const list = filter === 'all' ? companies
    : filter === '계열사그룹' ? subsidiaries : affiliates

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">회사별 상세</h2>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-xs text-gray-500">그룹 필터:</span>
        <div className="flex gap-1">
          {[{ k: 'all', l: '전체' }, { k: '계열사그룹', l: '계열사' }, { k: '관계사그룹', l: '관계사' }].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.k ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border hover:border-primary'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map(c => <CompanyCard key={c.name} c={c} />)}
      </div>
    </div>
  )
}
