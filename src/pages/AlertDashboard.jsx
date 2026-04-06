/**
 * 주요 이슈 회사 — 자동 알림 대시보드 (원본 tab-alert 포팅)
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCompany, slugify } from '../contexts/CompanyContext'
import { getAlertCompanies } from '../utils/alertEngine'
import { fmt, fmtGrowth, growthClass, fmtInd } from '../utils/groupFormatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function AlertItem({ alert }) {
  const typeConfig = {
    critical: { label: '긴급', bg: 'bg-red-50', border: 'border-l-red-600', icon: '⚠️', iconCls: 'text-red-600' },
    warning: { label: '경고', bg: 'bg-orange-50', border: 'border-l-orange-500', icon: '⚠️', iconCls: 'text-orange-500' },
    watch: { label: '주의', bg: 'bg-yellow-50', border: 'border-l-yellow-500', icon: '●', iconCls: 'text-yellow-600' },
  }
  const cfg = typeConfig[alert.type] || typeConfig.watch

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg mb-1.5 text-sm ${cfg.bg} border-l-3 ${cfg.border}`}>
      <span className={`text-base flex-shrink-0 ${cfg.iconCls}`}>{cfg.icon}</span>
      <div className="flex-1">
        <div className="text-[10px] text-gray-500 font-semibold mb-0.5">[{cfg.label}] {alert.area}</div>
        <div dangerouslySetInnerHTML={{ __html: alert.msg }} />
        {alert.values && (
          <table className="w-full text-xs mt-2 border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left px-2 py-1 font-semibold text-gray-500">지표</th>
                <th className="text-right px-2 py-1 font-semibold text-gray-500">22년</th>
                <th className="text-right px-2 py-1 font-semibold text-gray-500">23년</th>
                <th className="text-right px-2 py-1 font-semibold text-gray-500">24년</th>
                <th className="text-right px-2 py-1 font-semibold text-gray-500">25년</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1 text-gray-600 font-medium">{alert.metric || '-'}</td>
                {['y22', 'y23', 'y24', 'y25'].map((yr, i, arr) => {
                  const v = alert.values[yr]
                  const prev = i > 0 ? alert.values[arr[i - 1]] : null
                  const cls = prev != null && v != null
                    ? (alert.isRate
                      ? (v > prev ? 'text-decrease' : v < prev ? 'text-increase' : '')
                      : (v < prev ? 'text-decrease' : v > prev ? 'text-increase' : ''))
                    : ''
                  return (
                    <td key={yr} className={`text-right px-2 py-1 ${cls} ${yr === 'y25' ? 'font-bold' : ''}`}>
                      {fmtInd(v, alert.isRate)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AlertCompanyCard({ c }) {
  const sevCls = c.severity.critical > 0 ? 'border-l-red-600' : 'border-l-orange-500'
  const opmI = c.commonIndicators?.find(i => i.label.includes('영업이익률'))
  const opm25 = opmI?.values?.y25

  const chartData = ['y22', 'y23', 'y24', 'y25'].map((yr, i) => ({
    name: ['22', '23', '24', '25'][i],
    매출: c.revenue?.[yr] || 0,
    영업이익: c.operatingProfit?.[yr] || 0,
  }))

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden mb-5 border-l-[5px] ${sevCls}`}>
      {/* 헤더 */}
      <div className="px-5 py-4 bg-surface flex justify-between items-center border-b border-border">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Link to={`/company/${slugify(c.name)}`} className="hover:text-primary hover:underline">{c.name}</Link>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            c.group === '계열사그룹' ? 'bg-primary-light text-primary-dark' : 'bg-gray-100 text-gray-600'
          }`}>
            {c.group === '계열사그룹' ? '계열사' : '관계사'}
          </span>
        </h3>
        <div className="flex gap-1.5">
          {c.severity.critical > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">긴급 {c.severity.critical}</span>
          )}
          {c.severity.warning > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">경고 {c.severity.warning}</span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-surface rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500">25년 매출액</div>
            <div className="text-lg font-bold mt-0.5">{fmt(c.revenue?.y25, 0)}</div>
            <div className={`text-xs ${growthClass(c.revenueGrowth?.y25)}`}>
              {c.revenueGrowth?.y25 != null ? fmtGrowth(c.revenueGrowth.y25) : '-'}
            </div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500">25년 영업이익</div>
            <div className={`text-lg font-bold mt-0.5 ${(c.operatingProfit?.y25 || 0) >= 0 ? 'text-increase' : 'text-decrease'}`}>
              {fmt(c.operatingProfit?.y25, 0)}
            </div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500">영업이익률</div>
            <div className="text-lg font-bold mt-0.5">{opm25 != null ? (opm25 * 100).toFixed(1) + '%' : '-'}</div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500">위험도 점수</div>
            <div className="text-lg font-bold mt-0.5 text-decrease">{c.totalScore}</div>
          </div>
        </div>

        {/* 알림 목록 */}
        {c.alerts.map((a, i) => <AlertItem key={i} alert={a} />)}

        {/* 미니 차트 */}
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9 }} />
              <Tooltip formatter={v => fmt(v) + ' 억원'} />
              <Bar dataKey="매출" fill="#F5A623" radius={[3, 3, 0, 0]} />
              <Bar dataKey="영업이익">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.영업이익 >= 0 ? '#2E7D32' : '#D32F2F'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default function AlertDashboard() {
  const { companies } = useCompany()

  const alertCompanies = useMemo(() => getAlertCompanies(companies), [companies])
  const totalCritical = alertCompanies.reduce((s, c) => s + c.severity.critical, 0)
  const totalWarning = alertCompanies.reduce((s, c) => s + c.severity.warning, 0)
  const lossCount = alertCompanies.filter(c => c.alerts.some(a => a.msg.includes('적자'))).length
  const dropCount = alertCompanies.filter(c => c.alerts.some(a => a.msg.includes('급감'))).length

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
        <span className="text-decrease">⚠</span> 주요 이슈 회사
      </h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: '주요 이슈 법인', value: alertCompanies.length, cls: 'border-t-4 border-t-red-600 text-decrease' },
          { label: '긴급 (Critical)', value: totalCritical, cls: 'border-t-4 border-t-red-600 text-decrease' },
          { label: '경고 (Warning)', value: totalWarning, cls: 'border-t-4 border-t-orange-500 text-orange-600' },
          { label: '영업적자 법인', value: lossCount, cls: 'border-t-4 border-t-red-600 text-decrease' },
          { label: '매출/이익 급감', value: dropCount, cls: 'border-t-4 border-t-orange-500 text-orange-600' },
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 shadow-sm text-center ${card.cls}`}>
            <div className="text-3xl font-extrabold">{card.value}</div>
            <div className="text-[11px] text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 이슈 회사 목록 */}
      {alertCompanies.map(c => <AlertCompanyCard key={c.name} c={c} />)}

      {alertCompanies.length === 0 && (
        <div className="text-center py-20 text-gray-400">주요 이슈가 감지된 법인이 없습니다.</div>
      )}
    </div>
  )
}
