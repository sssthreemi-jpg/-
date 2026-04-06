import { useState, useMemo } from 'react'
import TrafficLight from './TrafficLight'
import ProductExpanded from './ProductExpanded'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { fmtBillion, fmtRatio, fmtDelta, deltaClass, wonToEok } from '../../utils/formatters'
import { getMonths } from '../../utils/periodHelpers'
import { computeTrafficLight } from '../../utils/trafficLight'
import { KEY_PRODUCTS_CONFIG, resolveKeyProducts } from '../../utils/keyProductsConfig'

export default function KeyProductsTable({ division, year, quarter, scData, periodCols }) {
  const config = KEY_PRODUCTS_CONFIG[division]
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [showAllCols, setShowAllCols] = useState(false)
  const { isMobile } = useBreakpoint()

  const { products, periodProducts } = useMemo(() => {
    if (!scData?.data || !config) return { products: [], periodProducts: {} }

    const curProducts = resolveKeyProducts(scData.data, division, year, quarter, config)
    const productNames = curProducts.map((p) => p.name)

    const extendedPeriods = []
    if (quarter > 0) {
      let y = year, q = quarter
      for (let i = 0; i < 5; i++) {
        extendedPeriods.unshift({ year: y, quarter: q })
        q -= 1
        if (q === 0) { q = 4; y -= 1 }
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        extendedPeriods.push({ year: year - i, quarter: 0 })
      }
    }

    const yoyPeriod = quarter > 0
      ? { year: year - 1, quarter }
      : { year: year - 1, quarter: 0 }

    const periodSalesMap = {}
    for (const p of [...extendedPeriods, yoyPeriod]) {
      const key = `${p.year}-${p.quarter}`
      if (periodSalesMap[key]) continue
      const months = getMonths(p.quarter)
      const filtered = scData.data.filter(
        (r) => r.division === division && r.year === p.year && months.includes(r.month),
      )

      const prodData = {}
      for (const name of productNames) {
        const item = config.customItems?.find((ci) => ci.name === name)
        let matching
        if (item) {
          matching = filtered.filter(item.filter)
        } else if (config.field === 'split') {
          matching = filtered.filter((r) => {
            if (config.mergeRules?.[name]) return config.mergeRules[name].includes(r.productGroup)
            return r.productGroup === name
          })
        } else if (config.mergeRules?.[name]) {
          matching = filtered.filter((r) => config.mergeRules[name].includes(r[config.field]))
        } else {
          matching = filtered.filter((r) => r[config.field] === name)
        }

        const sales = wonToEok(matching.reduce((s, r) => s + (r.sales || 0), 0))
        const cost = wonToEok(matching.reduce((s, r) => s + (r.cost || 0), 0))
        prodData[name] = { sales, cost, costRate: sales > 0 ? cost / sales : null }
      }
      periodSalesMap[key] = prodData
    }

    const curKey = `${year}-${quarter}`
    const yoyKey = `${yoyPeriod.year}-${yoyPeriod.quarter}`

    const products = curProducts.map((prod) => {
      const curSales = periodSalesMap[curKey]?.[prod.name]?.sales ?? 0
      const yoySales = periodSalesMap[yoyKey]?.[prod.name]?.sales ?? null

      const prevSales = periodSalesMap[`${extendedPeriods[3].year}-${extendedPeriods[3].quarter}`]?.[prod.name]?.sales ?? null
      const prev3Sales = extendedPeriods.slice(0, 3).map(
        (p) => periodSalesMap[`${p.year}-${p.quarter}`]?.[prod.name]?.sales ?? null,
      )

      const light = computeTrafficLight(curSales, yoySales, prevSales, prev3Sales)
      return { ...prod, light, yoySales, curSales }
    })

    return { products, periodProducts: periodSalesMap }
  }, [scData, division, year, quarter, config, periodCols])

  if (!config || products.length === 0) return null

  // 모바일: 당기만 표시 (전년동기비는 별도 고정 컬럼)
  const visibleCols = useMemo(() => {
    if (!isMobile || showAllCols) return periodCols
    if (periodCols.length <= 1) return periodCols
    return [periodCols[periodCols.length - 1]]
  }, [periodCols, isMobile, showAllCols])

  const colPeriodKeys = visibleCols.map((col) => {
    const m = col.label.match(/^(\d{2})\.(\d)Q$/)
    if (m) return `20${m[1]}-${m[2]}`
    const m2 = col.label.match(/^(\d{2})년$/)
    if (m2) return `20${m2[1]}-0`
    return null
  })

  const totalColSpan = visibleCols.length + 2
  const isQuarter = quarter > 0
  const productField = config.field === 'custom' || config.field === 'split' ? 'productGroup' : config.field

  function getFilterFn(productName) {
    if (config?.customItems) {
      const item = config.customItems.find((ci) => ci.name === productName)
      if (item) return item.filter
    }
    return null
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">주요품목 매출</h3>
        {isMobile && periodCols.length > 2 && (
          <button
            onClick={() => setShowAllCols((s) => !s)}
            className="text-xs text-primary font-medium flex items-center gap-1"
          >
            {showAllCols ? '간략히 보기' : '전체 기간 보기'}
            <span className="text-[10px]">{showAllCols ? '▲' : '▼'}</span>
          </button>
        )}
      </div>
      <div className="card-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm lg:text-base whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th scope="col" rowSpan={2} className="sticky left-0 bg-primary px-3 lg:px-4 py-2 text-left font-semibold z-10 min-w-[120px]">
                  품목
                </th>
                {isMobile && !showAllCols ? (
                  <th className="px-2 py-1.5 text-center font-semibold border-l border-white/60 border-b border-white/60" colSpan={1}>당기</th>
                ) : isQuarter ? (
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
                <th scope="col" rowSpan={2} className="px-2 py-1.5 text-center font-semibold border-l border-white/60 min-w-[70px] lg:min-w-[90px]">전년동기比</th>
              </tr>
              <tr className="bg-primary text-white text-xs lg:text-sm font-medium">
                {visibleCols.map((col) => (
                  <th key={col.label} className="px-1.5 py-1.5 text-center min-w-[70px] lg:min-w-[90px] border-l border-white/60">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => {
                const yoyDelta = prod.curSales != null && prod.yoySales != null
                  ? prod.curSales - prod.yoySales : null
                const yoyPct = prod.yoySales > 0
                  ? (prod.curSales - prod.yoySales) / prod.yoySales : null
                const isExpanded = expandedProduct === prod.name

                return [
                  <tr
                    key={prod.name}
                    className={`border-t border-border/60 cursor-pointer hover:bg-primary-light/50 transition-colors ${
                      isExpanded ? 'bg-primary-light' : ''
                    }`}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedProduct(isExpanded ? null : prod.name)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedProduct(isExpanded ? null : prod.name) } }}
                  >
                    <td className={`sticky left-0 z-10 px-3 py-2 font-medium whitespace-nowrap ${
                      isExpanded ? 'bg-primary-light' : 'bg-white'
                    }`}>
                      <span className="flex items-center gap-2">
                        <TrafficLight status={prod.light} />
                        {prod.name}
                        {prod.group && <span className="text-xs text-gray-400">({prod.group})</span>}
                        <span className="text-gray-300 text-xs">▸</span>
                      </span>
                    </td>
                    {colPeriodKeys.map((pk, i) => {
                      const d = periodProducts[pk]?.[prod.name]
                      return (
                        <td key={pk} className={`px-2 py-2 whitespace-nowrap border-l border-gray-200 ${
                          visibleCols[i]?.isCurrent ? 'bg-gray-50 font-semibold' : ''
                        }`}>
                          <div className="grid justify-center" style={{ gridTemplateColumns: '52px 42px', gap: '6px' }}>
                            <span className="text-right">{d ? fmtBillion(d.sales) : '-'}</span>
                            <span className="text-primary-dark text-xs text-right">{d?.costRate != null ? fmtRatio(d.costRate) : ''}</span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 whitespace-nowrap border-l border-gray-200">
                      <div className={`text-right ${deltaClass(yoyDelta)}`}>
                        {yoyDelta != null ? fmtDelta(yoyDelta) : '-'}
                      </div>
                      {yoyPct != null && (
                        <div className={`text-xs text-right ${deltaClass(yoyPct)}`}>
                          {yoyPct > 0 ? '+' : ''}{(yoyPct * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                  </tr>,

                  isExpanded && (
                    <tr key={`${prod.name}-detail`} className="bg-gray-50">
                      <td colSpan={totalColSpan} className="p-0">
                        <ProductExpanded
                          productName={prod.name}
                          division={division}
                          year={year}
                          quarter={quarter}
                          scData={scData}
                          field={productField}
                          mergeRules={config?.mergeRules}
                          filterFn={getFilterFn(prod.name)}
                        />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
