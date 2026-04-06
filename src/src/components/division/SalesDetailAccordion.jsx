import { useState, useMemo } from 'react'
import TrafficLight from './TrafficLight'
import ProductExpanded from './ProductExpanded'
import { fmtBillion, deltaClass, wonToEok } from '../../utils/formatters'
import { getMonths } from '../../utils/periodHelpers'
import { computeTrafficLight } from '../../utils/trafficLight'
import { KEY_PRODUCTS_CONFIG } from '../../utils/keyProductsConfig'

export default function SalesDetailAccordion({ open, onToggle, division, year, quarter, scData }) {
  const [expandedProduct, setExpandedProduct] = useState(null)

  const config = KEY_PRODUCTS_CONFIG[division]
  const field = division === '건기식' ? 'productName' : 'productGroup'

  const products = useMemo(() => {
    if (!scData?.data || !open) return []

    const divData = scData.data.filter((r) => r.division === division)
    const mergeRules = config?.mergeRules || {}

    function aggregateByField(yr, q) {
      const ms = getMonths(q)
      const groups = {}
      for (const r of divData) {
        if (r.year !== yr || !ms.includes(r.month)) continue
        let key = r[field] ?? '(미분류)'
        for (const [merged, sources] of Object.entries(mergeRules)) {
          if (sources.includes(key)) { key = merged; break }
        }
        if (!groups[key]) groups[key] = { sales: 0, cost: 0 }
        groups[key].sales += r.sales || 0
        groups[key].cost += r.cost || 0
      }
      return groups
    }

    const curGroups = aggregateByField(year, quarter)

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

    const periodGroups = extendedPeriods.map((p) => ({
      ...p,
      groups: aggregateByField(p.year, p.quarter),
    }))

    const yoyGroups = quarter > 0
      ? aggregateByField(year - 1, quarter)
      : aggregateByField(year - 1, 0)

    const items = Object.entries(curGroups)
      .map(([name, { sales, cost }]) => {
        const salesEok = wonToEok(sales)
        const costEok = wonToEok(cost)
        if (Math.abs(salesEok) < 0.01) return null

        const yoySales = yoyGroups[name] ? wonToEok(yoyGroups[name].sales) : null
        const prevSales = periodGroups[3]?.groups[name]
          ? wonToEok(periodGroups[3].groups[name].sales) : null
        const prev3Sales = periodGroups.slice(0, 3).map(
          (p) => p.groups[name] ? wonToEok(p.groups[name].sales) : null,
        )

        const light = computeTrafficLight(salesEok, yoySales, prevSales, prev3Sales)
        const yoyDelta = yoySales != null ? salesEok - yoySales : null

        return {
          name,
          sales: salesEok,
          cost: costEok,
          costRate: salesEok > 0 ? costEok / salesEok : null,
          light,
          yoyDelta,
        }
      })
      .filter(Boolean)

    const red = items.filter((i) => i.light === 'red').sort((a, b) => b.sales - a.sales)
    const rest = items.filter((i) => i.light !== 'red').sort((a, b) => b.sales - a.sales)

    return [...red, ...rest]
  }, [scData, division, year, quarter, open, field, config])

  function getFilterFn(productName) {
    if (config?.customItems) {
      const item = config.customItems.find((ci) => ci.name === productName)
      if (item) return item.filter
    }
    return null
  }

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
        매출세부
      </button>

      {open && (
        <div className="border border-border rounded-xl overflow-hidden mt-1">
          <div className="px-4 py-2 bg-gray-50 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-700">
              {division === '건기식' ? '품목구분2' : '품목구분1'} 별 매출 ({quarter === 0 ? `${year}년 연간` : `${year}년 ${quarter}Q`}, 단위: 억원)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-2 text-left font-semibold min-w-[160px]">품목</th>
                  <th className="px-3 py-2 text-right font-semibold min-w-[80px]">매출</th>
                  <th className="px-3 py-2 text-right font-semibold min-w-[70px]">원가율</th>
                  <th className="px-3 py-2 text-right font-semibold min-w-[80px]">전년비</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
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
                      <td className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          <TrafficLight status={prod.light} />
                          {prod.name}
                          <span className="text-gray-300 text-xs">▸</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{fmtBillion(prod.sales)}</td>
                      <td className="px-3 py-2 text-right">
                        {prod.costRate != null ? (prod.costRate * 100).toFixed(1) + '%' : '-'}
                      </td>
                      <td className={`px-3 py-2 text-right text-xs ${deltaClass(prod.yoyDelta)}`}>
                        {prod.yoyDelta != null
                          ? `${prod.yoyDelta > 0 ? '+' : ''}${fmtBillion(prod.yoyDelta)}`
                          : '-'}
                      </td>
                    </tr>,

                    isExpanded && (
                      <tr key={`${prod.name}-detail`} className="bg-gray-50">
                        <td colSpan={4} className="p-0">
                          <ProductExpanded
                            productName={prod.name}
                            division={division}
                            year={year}
                            quarter={quarter}
                            scData={scData}
                            field={field}
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
      )}
    </div>
  )
}
