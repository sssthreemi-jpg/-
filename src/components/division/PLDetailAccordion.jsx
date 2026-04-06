import { useState } from 'react'
import { PL_ITEMS } from '../../utils/constants'
import { fmtBillion, fmtRatio, fmtDelta, fmtDeltaPp, deltaClass } from '../../utils/formatters'

const ROOT_ITEMS = PL_ITEMS.filter((i) => i.level === 0)
const DRILLABLE = new Set([
  '매출', '매출원가', '영업판관비', '판매대행수수료',
  '매출변동비', '영업관리비', '일반관리비', '비효율비경상비용', 'R&D비용',
])
const HIGHLIGHT = new Set(['매출총이익', 'R&D차감전이익', '영업이익'])
const LABEL_OVERRIDE = { '비효율비경상비용': '기타비용' }

export default function PLDetailAccordion({ open, onToggle, division, periodCols, yoyPrev, periods }) {
  const [expanded, setExpanded] = useState({})

  function getVal(agg, key) {
    return agg?.[division]?.[key] ?? null
  }
  function getRatio(agg, key) {
    const sales = getVal(agg, '매출')
    const val = getVal(agg, key)
    if (!sales || !val) return null
    return val / sales
  }

  function AmountCell({ agg, itemKey, isSales, isCurrent, isHighlight }) {
    const val = getVal(agg, itemKey)
    const ratio = getRatio(agg, itemKey)
    const formatted = val != null ? fmtBillion(val) : '-'
    return (
      <td className={`py-1.5 whitespace-nowrap border-l border-gray-300 ${
        isCurrent ? (isHighlight ? 'bg-highlight' : 'bg-gray-50') : ''
      }`}>
        <div className="grid justify-center" style={{ gridTemplateColumns: '52px 42px', gap: '2px' }}>
          <span className={`text-right ${isCurrent ? 'font-semibold' : ''}`}>{formatted}</span>
          {!isSales && ratio != null ? (
            <span className="text-primary-dark text-xs text-right">{fmtRatio(ratio)}</span>
          ) : <span></span>}
        </div>
      </td>
    )
  }

  function DeltaCell({ itemKey, isSales }) {
    const curVal = getVal(periods.cur, itemKey)
    const prevVal = getVal(yoyPrev, itemKey)
    const delta = curVal != null && prevVal != null ? curVal - prevVal : null
    const curRatio = getRatio(periods.cur, itemKey)
    const prevRatio = getRatio(yoyPrev, itemKey)
    const deltaPp = curRatio != null && prevRatio != null ? curRatio - prevRatio : null

    return (
      <td className="py-1.5 whitespace-nowrap border-l border-gray-300">
        <div className="grid justify-center" style={{ gridTemplateColumns: '56px 44px', gap: '2px' }}>
          <span className={`text-right ${deltaClass(delta)}`}>{fmtDelta(delta)}</span>
          {!isSales && deltaPp != null ? (
            <span className={`text-xs text-right ${deltaClass(deltaPp)}`}>{fmtDeltaPp(deltaPp)}</span>
          ) : <span></span>}
        </div>
      </td>
    )
  }

  function SubRows({ parentKey }) {
    const children = PL_ITEMS.filter(
      (i) => i.level === 1 && i.key.startsWith(parentKey),
    )
    if (children.length === 0) return null
    return children.map(({ key, label }) => (
      <tr key={key} className="border-t border-border/30 bg-amber-50/30">
        <td className="sticky left-0 bg-amber-50/80 px-3 py-1 pl-8 text-sm text-gray-500 z-10 whitespace-nowrap">
          {label}
        </td>
        {periodCols.map((col) => (
          <AmountCell key={col.label} agg={col.agg} itemKey={key} isSales={false} isCurrent={col.isCurrent} />
        ))}
        <DeltaCell itemKey={key} isSales={false} />
      </tr>
    ))
  }

  const quarter = periods.mode === 'quarter'

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 py-2 px-1 transition-colors"
      >
        <span aria-hidden="true" className={`expand-arrow w-4 text-xs ${open ? 'rotated' : ''}`}>
          ▶
        </span>
        손익세부
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden mt-1">
          <div className="text-right text-xs text-gray-400 px-3 py-1">단위 : 억원</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-primary text-white">
                  <th scope="col" rowSpan={2} className="sticky left-0 bg-primary px-3 py-2 text-left font-semibold z-10 min-w-[100px]">
                    항목
                  </th>
                  {quarter ? (
                    <>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>전년 동기</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={3}>직전 3분기</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>당기</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={3}>직전 3개년</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>당기</th>
                    </>
                  )}
                  <th scope="col" rowSpan={2} className="px-2 py-1.5 text-center font-semibold border-l border-white/60 bg-primary min-w-[100px]">전년 동기比</th>
                </tr>
                <tr className="bg-primary text-white text-xs font-medium">
                  {periodCols.map((col) => (
                    <th key={col.label} className="px-2 py-1.5 text-center min-w-[70px] border-l border-white/60">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROOT_ITEMS.map(({ key, label }) => {
                  const isDrillable = DRILLABLE.has(key)
                  const isHighlight = HIGHLIGHT.has(key)
                  const isSales = key === '매출'
                  const isExpanded = expanded[key]

                  return [
                    <tr
                      key={key}
                      className={`border-t border-border/60 ${
                        isHighlight ? 'bg-highlight font-bold'
                          : isDrillable ? 'font-semibold' : ''
                      } ${isDrillable ? 'cursor-pointer hover:bg-primary-light' : ''} ${isExpanded ? 'bg-primary-light/40' : ''}`}
                      tabIndex={isDrillable ? 0 : undefined}
                      role={isDrillable ? 'button' : undefined}
                      aria-expanded={isDrillable ? !!isExpanded : undefined}
                      onClick={() => isDrillable && setExpanded((s) => ({ ...s, [key]: !s[key] }))}
                      onKeyDown={isDrillable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((s) => ({ ...s, [key]: !s[key] })) } } : undefined}
                    >
                      <td className={`sticky left-0 z-10 px-3 py-1.5 whitespace-nowrap ${
                        isHighlight ? 'bg-highlight font-bold'
                          : isExpanded ? 'bg-primary-light/60 font-semibold'
                          : isDrillable ? 'bg-white font-semibold' : 'bg-white'
                      }`}>
                        {isDrillable && (
                          <span aria-hidden="true" className={`expand-arrow w-4 text-gray-400 text-xs mr-1 ${isExpanded ? 'rotated' : ''}`}>▶</span>
                        )}
                        {LABEL_OVERRIDE[key] || label}
                      </td>
                      {periodCols.map((col) => (
                        <AmountCell key={col.label} agg={col.agg} itemKey={key} isSales={isSales} isCurrent={col.isCurrent} isHighlight={isHighlight} />
                      ))}
                      <DeltaCell itemKey={key} isSales={isSales} />
                    </tr>,
                    isExpanded && <SubRows key={`${key}-sub`} parentKey={key} />,
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
