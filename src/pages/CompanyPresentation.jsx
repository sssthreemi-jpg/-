/**
 * 회사별 발표 페이지 — 좌측 법인 선택, 우측 발표용 뷰 (원본 tab-present 포팅)
 */
import { useState } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { fmt, fmtGrowth, growthClass, fmtInd } from '../utils/groupFormatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

function PresentationContent({ company }) {
  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-gray-400">
        <div className="text-5xl mb-4">🎤</div>
        <div className="text-base text-center leading-relaxed">좌측에서 회사를 선택하면<br />발표용 손익 및 지표가 표시됩니다.</div>
      </div>
    )
  }

  const c = company
  const isAff = c.group === '관계사그룹'
  const opm = c.revenue?.y25 && c.operatingProfit?.y25 ? c.operatingProfit.y25 / c.revenue.y25 : null

  const chartData = ['y22', 'y23', 'y24', 'y25'].map((yr, i) => ({
    name: ['22년', '23년', '24년', '25년'][i],
    매출: c.revenue?.[yr] || 0,
    영업이익: c.operatingProfit?.[yr] || 0,
    원가율: c.commonIndicators?.find(x => x.label.includes('원가율'))?.values?.[yr] ? c.commonIndicators.find(x => x.label.includes('원가율')).values[yr] * 100 : null,
    판관비율: c.commonIndicators?.find(x => x.label.includes('판관비'))?.values?.[yr] ? c.commonIndicators.find(x => x.label.includes('판관비')).values[yr] * 100 : null,
    영업이익률: c.commonIndicators?.find(x => x.label.includes('영업이익률'))?.values?.[yr] ? c.commonIndicators.find(x => x.label.includes('영업이익률')).values[yr] * 100 : (c.revenue?.[yr] && c.operatingProfit?.[yr] ? (c.operatingProfit[yr] / c.revenue[yr]) * 100 : null),
  }))

  // 자동 코멘터리 생성
  const commentary = generateCommentary(c)

  return (
    <div>
      {/* 헤더 */}
      <div className={`p-6 text-white ${isAff ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-primary-dark to-primary'}`}>
        <h2 className="text-2xl font-bold">{c.name}</h2>
        <p className="text-sm text-white/70 mt-1">{c.group} | 2025년 실적 (단위: 억원)</p>
      </div>

      <div className="p-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '매출액', value: fmt(c.revenue?.y25), sub: c.revenueGrowth?.y25 != null ? fmtGrowth(c.revenueGrowth.y25) : null, subCls: growthClass(c.revenueGrowth?.y25) },
            { label: '매출원가', value: fmt(c.cogs?.y25) },
            { label: '매출총이익', value: fmt(c.grossProfit?.y25) },
            { label: '영업이익', value: fmt(c.operatingProfit?.y25), cls: (c.operatingProfit?.y25 || 0) < 0 ? 'text-decrease' : 'text-increase' },
            { label: '영업이익률', value: opm != null ? (opm * 100).toFixed(1) + '%' : '-' },
          ].map((kpi, i) => (
            <div key={i} className="bg-surface rounded-lg p-3 text-center border border-border-light">
              <div className="text-[10px] text-gray-500 uppercase font-medium">{kpi.label}</div>
              <div className={`text-lg font-bold mt-1 ${kpi.cls || ''}`}>{kpi.value}</div>
              {kpi.sub && <div className={`text-xs mt-0.5 ${kpi.subCls}`}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 border border-border-light">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">매출 / 영업이익 추이</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => fmt(v) + ' 억원'} />
                <Bar dataKey="매출" fill="#F5A623" radius={[3, 3, 0, 0]} />
                <Bar dataKey="영업이익" fill="#2E7D32" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-surface rounded-lg p-4 border border-border-light">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">수익성 추이 (%)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => v?.toFixed(1) + '%'} />
                {chartData.some(d => d.원가율) && <Line dataKey="원가율" stroke="#ef5350" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                {chartData.some(d => d.판관비율) && <Line dataKey="판관비율" stroke="#ff9800" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                <Line dataKey="영업이익률" stroke="#1565c0" strokeWidth={3} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 손익 테이블 */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">📊 전사 손익</h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-light">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">구분</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">22년</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">23년</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">24년</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">25년</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">26년 목표</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '매출액', data: c.revenue, hl: true },
                { label: '매출원가', data: c.cogs },
                { label: '매출총이익', data: c.grossProfit, hl: true },
                { label: '판관비', data: c.sga },
                { label: '영업이익', data: c.operatingProfit, hl: true },
              ].map((row, i) => (
                <tr key={i} className={`border-b border-border-light ${row.hl ? 'bg-highlight font-semibold' : 'hover:bg-surface'}`}>
                  <td className="px-3 py-2 text-gray-700">{row.label}</td>
                  <td className="text-right px-3 py-2 text-gray-500">{fmt(row.data?.y22)}</td>
                  <td className="text-right px-3 py-2 text-gray-500">{fmt(row.data?.y23)}</td>
                  <td className="text-right px-3 py-2 text-gray-500">{fmt(row.data?.y24)}</td>
                  <td className="text-right px-3 py-2 font-bold">{fmt(row.data?.y25)}</td>
                  <td className="text-right px-3 py-2 text-gray-400">{fmt(row.data?.target26)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 코멘터리 */}
        {commentary.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">💡 분석 코멘터리</h4>
            {commentary.map((section, i) => (
              <div key={i} className={`rounded-lg p-4 mb-2 text-sm leading-relaxed ${section.className}`}>
                <h5 className="font-bold mb-2 flex items-center gap-1">{section.icon} {section.title}</h5>
                <ul className="list-disc pl-5 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 지표 */}
        {c.commonIndicators?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold bg-primary-light text-primary-dark px-3 py-2 rounded-md mb-1">공통 지표 ({c.commonIndicators.length}개)</h4>
            <IndTable indicators={c.commonIndicators} />
          </div>
        )}
        {c.individualIndicators?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-2 rounded-md mb-1">개별 지표 ({c.individualIndicators.length}개)</h4>
            <IndTable indicators={c.individualIndicators} />
          </div>
        )}
      </div>
    </div>
  )
}

function IndTable({ indicators }) {
  const grouped = {}
  indicators.forEach(ind => {
    const cat = ind.category || '기타'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ind)
  })
  return (
    <>
      {Object.entries(grouped).map(([cat, inds]) => (
        <div key={cat}>
          {Object.keys(grouped).length > 1 && (
            <div className="text-[10px] font-bold text-increase px-3 py-1 border-b border-blue-100">{cat}</div>
          )}
          <table className="w-full text-xs mb-1">
            <thead>
              <tr className="bg-surface">
                <th className="text-left px-3 py-1.5 font-medium text-gray-500 min-w-[130px]">지표</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-500">22년</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-500">23년</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-500">24년</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-500">25년</th>
                <th className="text-right px-2 py-1.5 font-medium text-gray-500">26목표</th>
              </tr>
            </thead>
            <tbody>
              {inds.map((ind, i) => (
                <tr key={i} className="border-b border-border-light hover:bg-highlight/40">
                  <td className="px-3 py-1 text-gray-600">{ind.label}</td>
                  <td className="text-right px-2 py-1 text-gray-400">{fmtInd(ind.values?.y22, ind.isRate)}</td>
                  <td className="text-right px-2 py-1 text-gray-400">{fmtInd(ind.values?.y23, ind.isRate)}</td>
                  <td className="text-right px-2 py-1 text-gray-400">{fmtInd(ind.values?.y24, ind.isRate)}</td>
                  <td className="text-right px-2 py-1 font-semibold">{fmtInd(ind.values?.y25, ind.isRate)}</td>
                  <td className="text-right px-2 py-1 text-gray-400">{fmtInd(ind.values?.target26, ind.isRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}

function generateCommentary(c) {
  const sections = []
  const rev = c.revenue, op = c.operatingProfit
  const rg = c.revenueGrowth?.y25
  const ci = c.commonIndicators || []
  const opmI = ci.find(i => i.label.includes('영업이익률'))

  // 종합 요약
  const summary = []
  if (rev?.y25) summary.push(`25년 매출 <strong>${fmt(rev.y25)}억원</strong>${rg != null ? ` (전년比 ${fmtGrowth(rg)})` : ''}`)
  if (op?.y25 != null) summary.push(`영업이익 <strong>${fmt(op.y25)}억원</strong>${op.y25 < 0 ? ' (적자)' : ''}`)
  if (summary.length) sections.push({ title: '종합 요약', icon: '📋', className: 'bg-primary-light border border-primary/20', items: summary })

  // 이슈
  const issues = []
  if (op?.y25 != null && op.y25 < 0) issues.push(`<strong>영업적자</strong> ${fmt(op.y25)}억원 기록`)
  if (rg != null && rg < -0.1) issues.push(`매출 <strong>${fmtGrowth(rg)}</strong> 큰 폭 감소`)
  if (opmI?.values?.y24 && opmI?.values?.y25 && opmI.values.y25 < opmI.values.y24) {
    issues.push(`영업이익률 ${(opmI.values.y24 * 100).toFixed(1)}% → ${(opmI.values.y25 * 100).toFixed(1)}% 하락`)
  }
  if (issues.length) sections.push({ title: '이슈 및 주의사항', icon: '⚠️', className: 'bg-red-50 border border-red-200', items: issues })

  // 긍정적 변화
  const positive = []
  if (rg != null && rg > 0.1) positive.push(`매출 <strong>${fmtGrowth(rg)}</strong> 큰 폭 성장`)
  if (opmI?.values?.y24 && opmI?.values?.y25 && opmI.values.y25 > opmI.values.y24) {
    positive.push(`영업이익률 ${(opmI.values.y24 * 100).toFixed(1)}% → ${(opmI.values.y25 * 100).toFixed(1)}% 개선`)
  }
  if (positive.length) sections.push({ title: '긍정적 변화', icon: '✅', className: 'bg-green-50 border border-green-200', items: positive })

  return sections
}

export default function CompanyPresentation() {
  const { subsidiaries, affiliates } = useCompany()
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">회사별 발표</h2>
      <div className="flex gap-0 min-h-[calc(100vh-200px)]">
        {/* 좌측 사이드바 */}
        <div className="w-52 flex-shrink-0 bg-white rounded-l-xl shadow-sm overflow-y-auto max-h-[calc(100vh-200px)] border-r border-border">
          <div className="px-4 py-3 font-bold text-sm text-primary-dark border-b-2 border-primary bg-primary-light">법인 선택</div>
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-surface">계열사그룹</div>
          {subsidiaries.map(c => (
            <div key={c.name}
              onClick={() => setSelected(c)}
              className={`px-4 py-2.5 cursor-pointer text-sm border-b border-border-light flex justify-between items-center transition-colors ${
                selected?.name === c.name ? 'bg-primary text-white font-semibold' : 'hover:bg-primary-light'
              }`}>
              <span>{c.name}</span>
              <span className="text-[10px] opacity-60">{fmt(c.revenue?.y25, 0)}</span>
            </div>
          ))}
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-surface mt-1">관계사그룹</div>
          {affiliates.map(c => (
            <div key={c.name}
              onClick={() => setSelected(c)}
              className={`px-4 py-2.5 cursor-pointer text-sm border-b border-border-light flex justify-between items-center transition-colors ${
                selected?.name === c.name ? 'bg-primary text-white font-semibold' : 'hover:bg-primary-light'
              }`}>
              <span>{c.name}</span>
              <span className="text-[10px] opacity-60">{fmt(c.revenue?.y25, 0)}</span>
            </div>
          ))}
        </div>

        {/* 우측 발표 콘텐츠 */}
        <div className="flex-1 bg-white rounded-r-xl shadow-sm overflow-y-auto max-h-[calc(100vh-200px)]">
          <PresentationContent company={selected} />
        </div>
      </div>
    </div>
  )
}
