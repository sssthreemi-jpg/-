import { useState, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '../contexts/PeriodContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { PL_ITEMS, DIVISIONS } from '../utils/constants'
import { fmtBillion, fmtRatio, fmtDelta, fmtDeltaPp, deltaClass } from '../utils/formatters'
import { aggregate, prevQuarters } from '../utils/periodHelpers'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { NoDataState } from '../components/EmptyState'

// level:0 항목만 기본 표시
const ROOT_ITEMS = PL_ITEMS.filter((i) => i.level === 0)

// 드릴다운 가능 항목 (계산 결과인 매출총이익/R&D차감전이익/영업이익 제외)
const DRILLABLE = new Set([
  '매출', '매출원가', '영업판관비', '판매대행수수료',
  '매출변동비', '영업관리비', '일반관리비', '비효율비경상비용', 'R&D비용',
])

// 매출/매출원가는 하위 항목 대신 사업부별 드릴다운
const DIV_DRILL = new Set(['매출', '매출원가'])

// 하이라이트 행 (합계성)
const HIGHLIGHT = new Set(['매출총이익', 'R&D차감전이익', '영업이익'])

// 표시용 라벨 오버라이드
const LABEL_OVERRIDE = {
  '비효율비경상비용': '기타비용',
}

// ── 헬퍼: 특정 집계의 전사 금액 / 비율 (컴포넌트 외부) ──
function getVal(agg, key) {
  return agg?.['전사']?.[key] ?? null
}
function getRatio(agg, key) {
  const sales = getVal(agg, '매출')
  const val = getVal(agg, key)
  if (sales == null || sales === 0 || val == null) return null
  return val / sales
}

const shortYear = (y) => String(y).slice(2)

function formatAmount(v) {
  return v != null ? Math.round(v).toLocaleString('ko-KR') : '-'
}

// ── 금액 셀 (memo 적용) ──
const AmountCell = memo(function AmountCell({ agg, itemKey, isSales, isCurrent, isHighlight }) {
  const val = getVal(agg, itemKey)
  const ratio = getRatio(agg, itemKey)
  return (
    <td className={`py-2.5 lg:py-3 whitespace-nowrap border-l border-border ${
      isCurrent ? (isHighlight ? 'bg-highlight' : 'bg-surface') : ''
    }`}>
      <div className="grid-amount">
        <span className={`text-right ${isCurrent ? 'font-semibold' : ''}`}>{formatAmount(val)}</span>
        {!isSales && ratio != null
          ? <span className="text-primary-dark text-xs text-right">{fmtRatio(ratio)}</span>
          : null}
      </div>
    </td>
  )
})

// ── 전년동기比 셀 (memo 적용) ──
const DeltaCell = memo(function DeltaCell({ curAgg, prevAgg, itemKey, isSales }) {
  const curVal = getVal(curAgg, itemKey)
  const prevVal = getVal(prevAgg, itemKey)
  const delta = curVal != null && prevVal != null ? curVal - prevVal : null
  const curRatio = getRatio(curAgg, itemKey)
  const prevRatio = getRatio(prevAgg, itemKey)
  const deltaPp = curRatio != null && prevRatio != null ? curRatio - prevRatio : null

  return (
    <td className="py-2.5 lg:py-3 whitespace-nowrap border-l border-border">
      <div className="grid-delta">
        <span className={`text-right ${deltaClass(delta)}`}>{fmtDelta(delta)}</span>
        {!isSales && deltaPp != null
          ? <span className={`text-xs text-right ${deltaClass(deltaPp)}`}>{fmtDeltaPp(deltaPp)}</span>
          : null}
      </div>
    </td>
  )
})

// ── 사업부별 드릴다운 행 (memo 적용) ──
const DivisionRows = memo(function DivisionRows({ itemKey, periodCols, curAgg, prevAgg, onNavigate }) {
  const targetPage = itemKey === '매출' || itemKey === '매출원가' ? '/division' : null

  return DIVISIONS.map((div) => {
    const curVal = curAgg?.[div]?.[itemKey] ?? null
    const prevVal = prevAgg?.[div]?.[itemKey] ?? null
    const delta = curVal != null && prevVal != null ? curVal - prevVal : null

    return (
      <tr
        key={div}
        className={`border-t border-border/30 ${targetPage ? 'cursor-pointer hover:bg-primary-light' : ''}`}
        onClick={() => targetPage && onNavigate(`/division?division=${encodeURIComponent(div)}${itemKey === '매출원가' ? '&focus=매출원가' : ''}`)}
      >
        <td className="sticky left-0 bg-white px-3 py-2 pl-9 text-sm text-gray-500 z-10 whitespace-nowrap">
          <span className="flex items-center gap-1">
            {div}
            {targetPage ? <span className="text-gray-300 text-xs">▸</span> : null}
          </span>
        </td>
        {periodCols.map((col) => {
          const v = col.agg?.[div]?.[itemKey] ?? null
          return (
            <td key={col.label} className={`py-2 whitespace-nowrap border-l border-border ${
              col.isCurrent ? 'bg-surface' : ''
            }`}>
              <div className="grid-amount">
                <span className={`text-right ${col.isCurrent ? 'font-semibold' : ''}`}>{formatAmount(v)}</span>
              </div>
            </td>
          )
        })}
        <td className="py-2.5 lg:py-3 whitespace-nowrap border-l border-border">
          <div className="grid-delta">
            <span className={`text-right ${deltaClass(delta)}`}>{fmtDelta(delta)}</span>
          </div>
        </td>
      </tr>
    )
  })
})

// ── 하위 항목 행 (memo 적용) ──
const SubRows = memo(function SubRows({ parentKey, periodCols, curAgg, prevAgg }) {
  const children = PL_ITEMS.filter(
    (i) => i.level === 1 && i.key.startsWith(parentKey),
  )
  if (children.length === 0) return null
  return children.map(({ key, label }) => (
    <tr key={key} className="border-t border-border/30">
      <td className="sticky left-0 bg-white px-3 py-2 pl-9 text-sm text-gray-500 z-10 whitespace-nowrap">
        {label}
      </td>
      {periodCols.map((col) => (
        <AmountCell key={col.label} agg={col.agg} itemKey={key} isSales={false} isCurrent={col.isCurrent} />
      ))}
      <DeltaCell curAgg={curAgg} prevAgg={prevAgg} itemKey={key} isSales={false} />
    </tr>
  ))
})

export default function CompanySummary() {
  const { data, loading, year, quarter } = usePeriod()
  const [expanded, setExpanded] = useState({})     // 아코디언 토글
  const [divDrill, setDivDrill] = useState({ '매출': true })      // 사업부 드릴다운 토글
  const [showAllCols, setShowAllCols] = useState(false) // 모바일 전체 기간 토글
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()

  // ── 기간별 집계 ──
  const periods = useMemo(() => {
    if (!data) return null

    if (quarter > 0) {
      // 분기 모드
      const cur = aggregate(data.data, year, quarter)
      const prev = aggregate(data.data, year - 1, quarter)
      const prev3 = prevQuarters(year, quarter, 3).map(
        (p) => ({ ...p, agg: aggregate(data.data, p.year, p.quarter) }),
      )
      return { mode: 'quarter', cur, prev, prev3 }
    } else {
      // 연간 모드
      const cur = aggregate(data.data, year, 0)
      const prevYears = [year - 3, year - 2, year - 1].map((y) => ({
        year: y, agg: aggregate(data.data, y, 0),
      }))
      const prevYear = aggregate(data.data, year - 1, 0)
      return { mode: 'annual', cur, prevYears, prevYear }
    }
  }, [data, year, quarter])

  // ── 기간 열 정의 (useMemo) ──
  const { periodCols, yoyPrev } = useMemo(() => {
    if (!periods) return { periodCols: [], yoyPrev: null }

    if (periods.mode === 'quarter') {
      return {
        periodCols: [
          { label: `${shortYear(year - 1)}.${quarter}Q`, agg: periods.prev },
          ...periods.prev3.map((p) => ({
            label: `${shortYear(p.year)}.${p.quarter}Q`,
            agg: p.agg,
          })),
          { label: `${shortYear(year)}.${quarter}Q`, agg: periods.cur, isCurrent: true },
        ],
        yoyPrev: periods.prev,
      }
    } else {
      return {
        periodCols: [
          ...periods.prevYears.map((p) => ({
            label: `${shortYear(p.year)}년`,
            agg: p.agg,
          })),
          { label: `${shortYear(year)}년`, agg: periods.cur, isCurrent: true },
        ],
        yoyPrev: periods.prevYear,
      }
    }
  }, [periods, year, quarter])

  // ── 모바일 컬럼 축소: 당기만 표시 (전년동기비는 별도 고정 컬럼) ──
  const visibleCols = useMemo(() => {
    if (!isMobile || showAllCols) return periodCols
    if (periodCols.length <= 1) return periodCols
    return [periodCols[periodCols.length - 1]]
  }, [periodCols, isMobile, showAllCols])

  // ── 토글 핸들러 ──
  const toggleRow = useCallback((key) => {
    if (DIV_DRILL.has(key)) {
      setDivDrill((s) => ({ ...s, [key]: !s[key] }))
    } else {
      setExpanded((s) => ({ ...s, [key]: !s[key] }))
    }
  }, [])

  if (loading)
    return <TableSkeleton rows={12} />
  if (!periods?.cur)
    return <NoDataState />

  return (
    <div>
      {/* ════════ 타이틀 ════════ */}
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">전사 손익 총괄</h2>

      {/* ════════ 모바일 전체 기간 토글 + 단위 표시 ════════ */}
      <div className="flex items-center justify-between mb-2">
        {isMobile && periodCols.length > 2 ? (
          <button
            onClick={() => setShowAllCols((s) => !s)}
            aria-expanded={showAllCols}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            {showAllCols ? '간략히 보기' : '전체 기간 보기'}
            <span className="text-[10px]">{showAllCols ? '▲' : '▼'}</span>
          </button>
        ) : <span />}
        <span className="text-right text-xs text-gray-400">단위 : 억원</span>
      </div>

      {/* ════════ P&L 테이블 ════════ */}
      <div className="card-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
            {/* ── 헤더 2단 ── */}
            <thead>
              {/* 그룹 헤더 1행 */}
              <tr className="thead-primary text-white">
                <th
                  scope="col"
                  rowSpan={2}
                  className="sticky left-0 bg-primary px-3 lg:px-4 py-2.5 text-left font-semibold z-10 min-w-[90px] lg:min-w-[110px]"
                >
                  항목
                </th>
                {isMobile && !showAllCols ? (
                  <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>
                    당기
                  </th>
                ) : quarter > 0 ? (
                  <>
                    <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>
                      전년 동기
                    </th>
                    <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={3}>
                      직전 3분기
                    </th>
                    <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>
                      당기
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={3}>
                      직전 3개년
                    </th>
                    <th className="px-2 py-2 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>
                      당기
                    </th>
                  </>
                )}
                <th
                  scope="col"
                  rowSpan={2}
                  className="px-1 lg:px-2 py-2 text-center font-semibold border-l border-white/60 bg-primary min-w-[60px] lg:min-w-[100px]"
                >
                  전년 동기比
                </th>
              </tr>
              {/* 서브 헤더 2행 */}
              <tr className="bg-primary text-white text-[11px] lg:text-xs font-medium">
                {visibleCols.map((col) => (
                  <th
                    scope="col"
                    key={col.label}
                    className="px-1 lg:px-2 py-2 text-center min-w-[56px] lg:min-w-[100px] border-l border-white/60"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── 본문 ── */}
            <tbody>
              {ROOT_ITEMS.map(({ key, label }) => {
                const isDrillable = DRILLABLE.has(key)
                const isHighlight = HIGHLIGHT.has(key)
                const isDivType = DIV_DRILL.has(key)
                const isSales = key === '매출'
                const isExpanded = isDivType ? divDrill[key] : expanded[key]

                return [
                  // 메인 행
                  <tr
                    key={key}
                    className={`border-t border-border/60 ${
                      isHighlight ? 'bg-highlight font-bold border-t-2 border-primary/30'
                        : isDrillable ? 'font-semibold' : ''
                    } ${isDrillable ? 'cursor-pointer hover:bg-primary-light' : ''}`}
                    tabIndex={isDrillable ? 0 : undefined}
                    role={isDrillable ? 'button' : undefined}
                    aria-expanded={isDrillable ? !!isExpanded : undefined}
                    onClick={() => isDrillable && toggleRow(key)}
                    onKeyDown={isDrillable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(key) } } : undefined}
                  >
                    <td
                      className={`sticky left-0 z-10 px-3 lg:px-4 py-2.5 lg:py-3 whitespace-nowrap ${
                        isHighlight ? 'bg-highlight font-bold'
                          : isDrillable ? 'bg-white font-semibold' : 'bg-white'
                      }`}
                    >
                      {isDrillable ? (
                        <span aria-hidden="true" className={`expand-arrow w-4 text-gray-400 text-xs mr-1 ${isExpanded ? 'rotated' : ''}`}>
                          ▶
                        </span>
                      ) : null}
                      {LABEL_OVERRIDE[key] || label}
                    </td>
                    {visibleCols.map((col) => (
                      <AmountCell key={col.label} agg={col.agg} itemKey={key} isSales={isSales} isCurrent={col.isCurrent} isHighlight={isHighlight} />
                    ))}
                    <DeltaCell curAgg={periods.cur} prevAgg={yoyPrev} itemKey={key} isSales={isSales} />
                  </tr>,

                  // 드릴다운: 사업부별 패널
                  isDivType && isExpanded ? (
                    <DivisionRows key={`${key}-div`} itemKey={key} periodCols={visibleCols} curAgg={periods.cur} prevAgg={yoyPrev} onNavigate={navigate} />
                  ) : null,

                  // 드릴다운: 하위 항목 아코디언
                  !isDivType && isExpanded ? (
                    <SubRows key={`${key}-sub`} parentKey={key} periodCols={visibleCols} curAgg={periods.cur} prevAgg={yoyPrev} />
                  ) : null,
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
