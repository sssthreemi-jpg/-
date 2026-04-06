import { useState, useMemo } from 'react'
import { usePeriod } from '../contexts/PeriodContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { DIVISIONS, DIVISION_COLORS } from '../utils/constants'
import { fmtBillion, fmtPercent } from '../utils/formatters'
import CostVarianceCascade from '../components/CostVarianceCascade'
import ExpenseDrilldown from '../components/ExpenseDrilldown'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { NoDataState } from '../components/EmptyState'

const ALL_DIVS = [...DIVISIONS, '전사']

/* ── 비용 대분류 항목 정의 ── */
const COST_CATEGORIES = [
  {
    key: '영업판관비', label: '영업판관비',
    subs: [
      { key: '영업판관비_영업비용', label: '영업비용' },
      { key: '영업판관비_마케팅비용', label: '마케팅비용' },
      { key: '영업판관비_영업직접비', label: '영업직접비' },
      { key: '영업판관비_영업인건비', label: '영업인건비' },
      { key: '영업판관비_마케팅인건비', label: '마케팅인건비' },
      { key: '영업판관비_광고비', label: '광고비' },
    ],
  },
  {
    key: '판매대행수수료', label: '판매대행수수료',
    subs: [
      { key: '판매대행수수료_국내', label: '국내' },
      { key: '판매대행수수료_해외', label: '해외' },
    ],
  },
  {
    key: '매출변동비', label: '매출변동비',
    subs: [
      { key: '매출변동비_운반비', label: '운반비' },
      { key: '매출변동비_쇼핑몰수수료', label: '쇼핑몰수수료' },
      { key: '매출변동비_OTC로열티', label: 'OTC로열티' },
      { key: '매출변동비_ETC로열티', label: 'ETC로열티' },
      { key: '매출변동비_EGF로열티', label: 'EGF로열티' },
      { key: '매출변동비_카드수수료', label: '카드수수료' },
    ],
  },
  {
    key: '영업관리비', label: '영업관리비',
    subs: [
      { key: '영업관리비_인건비', label: '인건비' },
      { key: '영업관리비_지사운영비', label: '지사운영비' },
      { key: '영업관리비_감가상각비', label: '감가상각비' },
      { key: '영업관리비_기타경비', label: '기타경비' },
    ],
  },
  {
    key: '일반관리비', label: '일반관리비',
    subs: [
      { key: '일반관리비_인건비', label: '인건비' },
      { key: '일반관리비_대웅용역료', label: '대웅용역료' },
      { key: '일반관리비_감가상각비', label: '감가상각비' },
      { key: '일반관리비_IT비용', label: 'IT비용' },
      { key: '일반관리비_세금과공과', label: '세금과공과' },
      { key: '일반관리비_지급수수료', label: '지급수수료' },
      { key: '일반관리비_기타경비', label: '기타경비' },
    ],
  },
  {
    key: '비효율비경상비용', label: '기타비용',
    subs: [
      { key: '비효율비경상비용_소송비용', label: '소송비용' },
      { key: '비효율비경상비용_대손상각비', label: '대손상각비' },
    ],
  },
  {
    key: 'R&D비용', label: 'R&D비용',
    subs: [
      { key: 'R&D비용_R연구', label: 'R(연구)' },
      { key: 'R&D비용_D개발', label: 'D(개발)' },
    ],
  },
]

export default function ExpenseAnalysis() {
  const { data, loading, year, quarter } = usePeriod()
  const { isMobile } = useBreakpoint()
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [drilldownCat, setDrilldownCat] = useState(null)  // {key, label} for RAW(E) drilldown
  const [showDivTable, setShowDivTable] = useState(false)

  const months = quarter === 0
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [quarter * 3 - 2, quarter * 3 - 1, quarter * 3]

  // ── 데이터 집계 ──
  const { current, previous } = useMemo(() => {
    if (!data) return { current: null, previous: null }

    function agg(yr) {
      const entries = data.data.filter(
        (e) => e.type === '실적' && e.year === yr && months.includes(e.month),
      )
      if (!entries.length) return null

      const result = {}
      ALL_DIVS.forEach((div) => {
        result[div] = {}
        // 매출 (비율 계산용)
        result[div]['매출'] = entries.reduce(
          (s, e) => s + (e.items?.[div]?.['매출'] ?? 0), 0,
        )
        // 비용 항목
        COST_CATEGORIES.forEach(({ key, subs }) => {
          result[div][key] = entries.reduce(
            (s, e) => s + (e.items?.[div]?.[key] ?? 0), 0,
          )
          subs.forEach(({ key: sk }) => {
            result[div][sk] = entries.reduce(
              (s, e) => s + (e.items?.[div]?.[sk] ?? 0), 0,
            )
          })
        })
      })
      return result
    }

    return { current: agg(year), previous: agg(year - 1) }
  }, [data, year, months])

  if (loading) return <TableSkeleton rows={10} />
  if (!current) return <NoDataState />

  const periodLabel = quarter === 0 ? `${year}년 연간` : `${year}년 ${quarter}Q`
  const totalSales = current['전사']['매출']

  // 비용 합계
  const totalCost = COST_CATEGORIES.reduce((s, { key }) => s + (current['전사'][key] ?? 0), 0)

  const prevTotalSales = previous?.['전사']?.['매출'] ?? 0

  function toggleExpand(key) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">비용 분석</h2>

      {/* ════════ KPI 카드 ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-6">
        {(() => {
          const prevTotalCost = previous
            ? COST_CATEGORIES.reduce((s, { key }) => s + (previous['전사'][key] ?? 0), 0)
            : null
          const prevSales = previous?.['전사']?.['매출']
          const curRatio = totalSales ? totalCost / totalSales : null
          const prevRatio = prevSales ? prevTotalCost / prevSales : null
          const cards = [
            { label: '총 비용', val: totalCost, prev: prevTotalCost, fmt: 'b' },
            { label: '매출대비 비율', val: curRatio, prev: prevRatio, fmt: 'r' },
            { label: 'R&D비용', val: current['전사']['R&D비용'], prev: previous?.['전사']?.['R&D비용'], fmt: 'b' },
            { label: '영업판관비', val: current['전사']['영업판관비'], prev: previous?.['전사']?.['영업판관비'], fmt: 'b' },
          ]
          return cards.map(({ label, val, prev, fmt }) => {
            const diff = val != null && prev != null ? val - prev : null
            const good = fmt === 'r' ? diff < 0 : diff < 0  // 비용은 감소가 긍정
            return (
              <div key={label} className="kpi-card">
                <p className="text-xs lg:text-sm text-gray-500 mb-1.5">{label}</p>
                <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                  {fmt === 'r' ? fmtPercent(val) : fmtBillion(val)}
                  {fmt === 'b' && <span className="text-xs font-normal text-gray-400 ml-1">억원</span>}
                </p>
                {diff != null && Math.abs(diff) > 0.01 && (
                  <p className={`text-xs mt-0.5 ${good ? 'text-increase' : 'text-decrease'}`}>
                    {fmt === 'r'
                      ? `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%p`
                      : `${diff > 0 ? '+' : ''}${fmtBillion(diff)}억`}
                  </p>
                )}
              </div>
            )
          })
        })()}
      </div>

      {/* ════════ 비용 증감 분석 (Variance Cascade) ════════ */}
      {previous && (
        <CostVarianceCascade
          categories={COST_CATEGORIES}
          current={current}
          previous={previous}
          totalSales={totalSales}
          prevTotalSales={prevTotalSales}
          periodLabel={periodLabel}
          isMobile={isMobile}
        />
      )}

      {/* ════════ 전사 비용 총괄 테이블 ════════ */}
      <div className="card-section overflow-hidden mb-6">
        <div className="px-4 lg:px-5 py-2.5 bg-gray-50 border-b border-border">
          <h3 className="text-sm lg:text-base font-semibold text-gray-800">
            전사 비용 총괄 ({periodLabel}, 단위: 억원)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th scope="col" className="px-3 lg:px-4 py-2 text-left font-semibold min-w-[120px] lg:min-w-[180px]">비용 항목</th>
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[100px]">금액</th>
                {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">매출비</th>}
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[100px]">전년동기</th>
                <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">증감</th>
                {!isMobile && <th scope="col" className="px-3 lg:px-4 py-2 text-right font-semibold min-w-[70px] lg:min-w-[90px]">증감률</th>}
              </tr>
            </thead>
            <tbody>
              {COST_CATEGORIES.map(({ key, label, subs }) => {
                const cur = current['전사'][key] ?? 0
                const prev = previous?.['전사']?.[key] ?? 0
                const diff = cur - prev
                const ratio = totalSales ? cur / totalSales : null
                const growthRate = prev ? diff / Math.abs(prev) : null
                const isExpanded = expandedCats.has(key)

                return (
                  <CostRow
                    key={key}
                    itemKey={key}
                    label={label}
                    cur={cur}
                    prev={prev}
                    diff={diff}
                    ratio={ratio}
                    growthRate={growthRate}
                    isHeader
                    hasSubs={subs.length > 0}
                    isExpanded={isExpanded}
                    isDrillActive={drilldownCat?.key === key}
                    isMobile={isMobile}
                    onToggle={() => toggleExpand(key)}
                    onDrilldown={() => setDrilldownCat(
                      drilldownCat?.key === key ? null : { key, label },
                    )}
                    subs={isExpanded ? subs.map(({ key: sk, label: sl }) => {
                      const sc = current['전사'][sk] ?? 0
                      const sp = previous?.['전사']?.[sk] ?? 0
                      return {
                        key: sk, label: sl, cur: sc, prev: sp,
                        diff: sc - sp,
                        ratio: totalSales ? sc / totalSales : null,
                        growthRate: sp ? (sc - sp) / Math.abs(sp) : null,
                      }
                    }) : []}
                  />
                )
              })}
              {/* 합계 */}
              {(() => {
                const prevTotal = previous
                  ? COST_CATEGORIES.reduce((s, { key }) => s + (previous['전사'][key] ?? 0), 0)
                  : 0
                const diff = totalCost - prevTotal
                return (
                  <tr className="border-t-2 border-primary bg-gray-50 font-bold">
                    <td className="px-3 lg:px-4 py-2">비용 합계</td>
                    <td className="px-3 lg:px-4 py-2 text-right">{fmtBillion(totalCost)}</td>
                    {!isMobile && <td className="px-3 lg:px-4 py-2 text-right">{totalSales ? fmtPercent(totalCost / totalSales) : '-'}</td>}
                    <td className="px-3 lg:px-4 py-2 text-right">{fmtBillion(prevTotal)}</td>
                    <td className={`px-3 lg:px-4 py-2 text-right ${diff > 0 ? 'text-decrease' : 'text-increase'}`}>
                      {`${diff > 0 ? '+' : ''}${fmtBillion(diff)}`}
                    </td>
                    {!isMobile && <td className={`px-3 lg:px-4 py-2 text-right ${diff > 0 ? 'text-decrease' : 'text-increase'}`}>
                      {prevTotal ? `${diff > 0 ? '+' : ''}${((diff / Math.abs(prevTotal)) * 100).toFixed(1)}%` : '-'}
                    </td>}
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ RAW(E) 세부항목 드릴다운 ════════ */}
      {drilldownCat && (
        <div className="mb-6">
          <ExpenseDrilldown
            category2={drilldownCat.key === '비효율비경상비용' ? '비효율/비경상비용' : drilldownCat.key}
            label={drilldownCat.label}
            year={year}
            months={months}
            onClose={() => setDrilldownCat(null)}
          />
        </div>
      )}

      {/* ════════ 사업부별 비용 배분 테이블 ════════ */}
      <div className="card-section overflow-hidden">
        <button
          onClick={() => setShowDivTable((s) => !s)}
          aria-expanded={showDivTable}
          className="w-full px-4 lg:px-5 py-3 bg-gray-50 border-b border-border flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-sm lg:text-base font-semibold text-gray-800">
            사업부별 비용 배분 ({periodLabel})
          </h3>
          <span aria-hidden="true" className={`expand-arrow text-gray-400 ${showDivTable ? 'rotated' : ''}`}>▶</span>
        </button>
        {showDivTable && <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th scope="col" className="sticky left-0 bg-primary px-3 lg:px-4 py-2 text-left font-semibold z-10 min-w-[110px] lg:min-w-[160px]">
                  비용 항목
                </th>
                {ALL_DIVS.map((div) => (
                  <th scope="col" key={div} className="px-3 py-2 text-right font-semibold min-w-[80px]">
                    {div}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COST_CATEGORIES.map(({ key, label }) => (
                <tr key={key} className="border-t border-border/60">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium z-10">
                    {label}
                  </td>
                  {ALL_DIVS.map((div) => {
                    const val = current[div]?.[key] ?? 0
                    const prev = previous?.[div]?.[key] ?? 0
                    const diff = val - prev
                    return (
                      <td key={div} className={`px-3 py-2 text-right ${div === '전사' ? 'font-semibold bg-gray-50/50' : ''}`}>
                        <span>{fmtBillion(val)}</span>
                        {Math.abs(diff) > 0.05 && (
                          <span className={`block text-[10px] ${diff > 0 ? 'text-decrease' : 'text-increase'}`}>
                            {diff > 0 ? '+' : ''}{fmtBillion(diff)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* 합계 행 */}
              <tr className="border-t-2 border-primary bg-gray-50 font-semibold">
                <td className="sticky left-0 bg-gray-50 px-3 py-2 z-10">합계</td>
                {ALL_DIVS.map((div) => {
                  const total = COST_CATEGORIES.reduce((s, { key }) => s + (current[div]?.[key] ?? 0), 0)
                  return (
                    <td key={div} className="px-3 py-2 text-right">{fmtBillion(total)}</td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  )
}

/* ── 비용 행 컴포넌트 (대분류 + 세부항목 확장) ── */
function CostRow({ label, cur, prev, diff, ratio, growthRate, isHeader, hasSubs, isExpanded, isDrillActive, isMobile, onToggle, onDrilldown, subs }) {
  return (
    <>
      <tr
        className={`border-t border-border/60 ${hasSubs ? 'cursor-pointer hover:bg-primary-light transition-colors' : ''} ${isDrillActive ? 'bg-primary-light' : ''}`}
        tabIndex={hasSubs ? 0 : undefined}
        role={hasSubs ? 'button' : undefined}
        aria-expanded={hasSubs ? isExpanded : undefined}
        onClick={hasSubs ? onToggle : undefined}
        onKeyDown={hasSubs ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } } : undefined}
      >
        <td className="px-3 py-2 font-semibold">
          <span className="flex items-center gap-1">
            {hasSubs && (
              <span aria-hidden="true" className={`expand-arrow text-xs text-gray-400 ${isExpanded ? 'rotated' : ''}`}>
                ▸
              </span>
            )}
            {label}
            {onDrilldown && (
              <button
                onClick={(e) => { e.stopPropagation(); onDrilldown() }}
                className={`ml-auto text-xs px-2 py-1 rounded border transition-colors ${
                  isDrillActive
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'text-gray-400 border-gray-300 hover:border-gray-500 hover:text-gray-600'
                }`}
                aria-label="세부항목 드릴다운"
                title="RAW(E) 세부항목 드릴다운"
              >
                상세
              </button>
            )}
          </span>
        </td>
        <td className="px-3 lg:px-4 py-2 text-right font-semibold">{fmtBillion(cur)}</td>
        {!isMobile && <td className="px-3 lg:px-4 py-2 text-right text-gray-500">{fmtPercent(ratio)}</td>}
        <td className="px-3 lg:px-4 py-2 text-right text-gray-500">{fmtBillion(prev)}</td>
        <td className={`px-3 lg:px-4 py-2 text-right ${diff > 0 ? 'text-decrease' : diff < 0 ? 'text-increase' : ''}`}>
          {`${diff > 0 ? '+' : ''}${fmtBillion(diff)}`}
        </td>
        {!isMobile && <td className={`px-3 lg:px-4 py-2 text-right ${diff > 0 ? 'text-decrease' : diff < 0 ? 'text-increase' : ''}`}>
          {growthRate != null ? `${growthRate > 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%` : '-'}
        </td>}
      </tr>
      {subs.map((sub) => (
        <tr key={sub.key} className="border-t border-border/30 bg-gray-50/50">
          <td className="px-3 lg:px-4 py-1.5 pl-9 text-gray-600">{sub.label}</td>
          <td className="px-3 lg:px-4 py-1.5 text-right text-gray-700">{fmtBillion(sub.cur)}</td>
          {!isMobile && <td className="px-3 lg:px-4 py-1.5 text-right text-gray-400">{fmtPercent(sub.ratio)}</td>}
          <td className="px-3 lg:px-4 py-1.5 text-right text-gray-400">{fmtBillion(sub.prev)}</td>
          <td className={`px-3 lg:px-4 py-1.5 text-right text-xs ${sub.diff > 0 ? 'text-decrease' : sub.diff < 0 ? 'text-increase' : ''}`}>
            {Math.abs(sub.diff) > 0.05 ? `${sub.diff > 0 ? '+' : ''}${fmtBillion(sub.diff)}` : '-'}
          </td>
          {!isMobile && <td className={`px-3 lg:px-4 py-1.5 text-right text-xs ${sub.diff > 0 ? 'text-decrease' : sub.diff < 0 ? 'text-increase' : ''}`}>
            {sub.growthRate != null && Math.abs(sub.growthRate) > 0.001
              ? `${sub.growthRate > 0 ? '+' : ''}${(sub.growthRate * 100).toFixed(1)}%`
              : '-'}
          </td>}
        </tr>
      ))}
    </>
  )
}
