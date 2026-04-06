import { fmtBillion, fmtRatio, fmtDelta, fmtDeltaPp, deltaClass } from '../../utils/formatters'
import { DIVISION_KPI_CONFIG } from '../../utils/divisionKpiConfig'

function KpiCard({ label, value, prevValue, format, deltaType }) {
  let displayValue = '-'
  let delta = null
  let deltaDisplay = null

  if (format === 'amount') {
    displayValue = value != null ? `${fmtBillion(value)}억` : '-'
    delta = value != null && prevValue != null ? value - prevValue : null
    deltaDisplay = delta != null ? `${fmtDelta(delta)}억` : null
  } else if (format === 'percent') {
    displayValue = value != null ? fmtRatio(value) : '-'
    delta = value != null && prevValue != null ? value - prevValue : null
    deltaDisplay = delta != null ? fmtDeltaPp(delta) : null
  } else if (format === 'count') {
    displayValue = value != null ? value.toLocaleString('ko-KR') : '-'
    delta = value != null && prevValue != null ? value - prevValue : null
    deltaDisplay = delta != null ? `${delta > 0 ? '+' : ''}${delta}` : null
  } else if (format === 'amountWithRatio') {
    displayValue = value != null ? `${fmtBillion(value)}억` : '-'
    delta = value != null && prevValue != null ? value - prevValue : null
    deltaDisplay = delta != null ? `${fmtDelta(delta)}억` : null
  }

  const deltaLabel = deltaType === 'prevPeriod' ? '전기比' : '전년동기比'

  return (
    <div className="kpi-card">
      <div className="text-xs lg:text-sm text-gray-500 mb-1.5">{label}</div>
      <div className="text-xl lg:text-2xl font-bold tracking-tight">{displayValue}</div>
      {deltaDisplay != null && (
        <div className={`text-xs mt-1 ${deltaClass(delta)}`}>
          {deltaLabel} {deltaDisplay}
        </div>
      )}
    </div>
  )
}

function KpiCardWithRatio({ label, value, prevValue, ratio, prevRatio }) {
  const delta = value != null && prevValue != null ? value - prevValue : null
  const ratioDelta = ratio != null && prevRatio != null ? ratio - prevRatio : null

  return (
    <div className="kpi-card">
      <div className="text-xs lg:text-sm text-gray-500 mb-1.5">{label}</div>
      <div className="text-xl lg:text-2xl font-bold tracking-tight">
        {value != null ? `${fmtBillion(value)}억` : '-'}
        {ratio != null && (
          <span className="text-sm font-normal text-primary-dark ml-1">
            ({fmtRatio(ratio)})
          </span>
        )}
      </div>
      {delta != null && (
        <div className={`text-xs mt-1 ${deltaClass(delta)}`}>
          전년동기比 {fmtDelta(delta)}억
          {ratioDelta != null && (
            <span className={`ml-1.5 ${deltaClass(ratioDelta)}`}>{fmtDeltaPp(ratioDelta)}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function KpiCards({ division, year, quarter, plAgg, scData, kpiData }) {
  const prevYear = year - 1

  // 공통 KPI
  const sales = plAgg?.cur?.[division]?.['매출']
  const prevSales = plAgg?.yoyPrev?.[division]?.['매출']
  const costRate = sales > 0 ? (plAgg?.cur?.[division]?.['매출원가'] ?? 0) / sales : null
  const prevCostRate = prevSales > 0
    ? (plAgg?.yoyPrev?.[division]?.['매출원가'] ?? 0) / prevSales : null
  const rndProfit = plAgg?.cur?.[division]?.['R&D차감전이익']
  const prevRndProfit = plAgg?.yoyPrev?.[division]?.['R&D차감전이익']
  const opProfit = plAgg?.cur?.[division]?.['영업이익']
  const prevOpProfit = plAgg?.yoyPrev?.[division]?.['영업이익']

  // 사업부별 KPI
  const divConfig = DIVISION_KPI_CONFIG[division] || []
  const divKpis = divConfig.map((cfg) => {
    const result = cfg.compute(scData?.data || [], plAgg, kpiData, division, year, quarter, prevYear)
    return { ...cfg, ...result }
  })

  return (
    <div className="space-y-3 mb-5">
      {/* 1행: 공통 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-3">
        <KpiCard label="매출" value={sales} prevValue={prevSales} format="amount" />
        <KpiCard label="원가율" value={costRate} prevValue={prevCostRate} format="percent" />
        <KpiCard label="R&D차감전이익" value={rndProfit} prevValue={prevRndProfit} format="amount" />
        <KpiCard label="영업이익" value={opProfit} prevValue={prevOpProfit} format="amount" />
      </div>

      {/* 2행: 사업부별 KPI */}
      {divKpis.length > 0 && (
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(divKpis.length, 4)} gap-2.5 lg:gap-3`}
          style={{ gridTemplateColumns: `repeat(${Math.min(divKpis.length, 4)}, minmax(0, 1fr))` }}
        >
          {divKpis.map((kpi) =>
            kpi.format === 'amountWithRatio' ? (
              <KpiCardWithRatio
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                prevValue={kpi.prevValue}
                ratio={kpi.ratio}
                prevRatio={kpi.prevRatio}
              />
            ) : (
              <KpiCard
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                prevValue={kpi.prevValue}
                format={kpi.format}
                deltaType={kpi.deltaType}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
