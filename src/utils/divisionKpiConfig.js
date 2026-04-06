import { wonToEok } from './formatters'
import { getMonths } from './periodHelpers'

/** DH매출 품목구분1 목록 (추후 변경 가능) */
export const DH_PRODUCT_GROUPS = [
  '리브레', '모비케어', '카트BP', 'thynC', '옵티나', '위스키(코)', '에띠아(코)',
]

/**
 * scData에서 특정 조건의 매출 합산 (원 → 억원)
 */
function sumSales(scData, division, year, quarter, filterFn) {
  const months = getMonths(quarter)
  let total = 0
  for (const r of scData) {
    if (r.division === division && r.year === year && months.includes(r.month)) {
      if (filterFn(r)) total += r.sales || 0
    }
  }
  return wonToEok(total)
}

/**
 * 사업부별 KPI 설정
 * 각 항목의 compute 함수는 { value, prevValue, extra? } 를 반환
 */
export const DIVISION_KPI_CONFIG = {
  ETC: [
    {
      key: 'productRatio',
      label: '제품비중',
      format: 'percent',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const total = sumSales(scData, div, year, quarter, () => true)
        const goods = sumSales(scData, div, year, quarter, (r) => r.productType === '상품')
        const value = total > 0 ? (1 - goods / total) : null

        const prevTotal = sumSales(scData, div, prevYear, quarter, () => true)
        const prevGoods = sumSales(scData, div, prevYear, quarter, (r) => r.productType === '상품')
        const prevValue = prevTotal > 0 ? (1 - prevGoods / prevTotal) : null

        return { value, prevValue }
      },
    },
    {
      key: 'tierASales',
      label: '가군매출',
      format: 'amountWithRatio',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const tierA = sumSales(scData, div, year, quarter, (r) => r.profitTier === '가')
        const total = sumSales(scData, div, year, quarter, () => true)
        const ratio = total > 0 ? tierA / total : null

        const prevTierA = sumSales(scData, div, prevYear, quarter, (r) => r.profitTier === '가')
        const prevTotal = sumSales(scData, div, prevYear, quarter, () => true)
        const prevRatio = prevTotal > 0 ? prevTierA / prevTotal : null

        return { value: tierA, prevValue: prevTierA, ratio, prevRatio }
      },
    },
    {
      key: 'dhSales',
      label: 'DH매출',
      format: 'amount',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const value = sumSales(scData, div, year, quarter,
          (r) => DH_PRODUCT_GROUPS.includes(r.productGroup))
        const prevValue = sumSales(scData, div, prevYear, quarter,
          (r) => DH_PRODUCT_GROUPS.includes(r.productGroup))
        return { value, prevValue }
      },
    },
  ],

  CH: [
    {
      key: 'premiumSales',
      label: '명품군매출',
      format: 'amount',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const value = sumSales(scData, div, year, quarter, (r) => r.category === '명품군')
        const prevValue = sumSales(scData, div, prevYear, quarter, (r) => r.category === '명품군')
        return { value, prevValue }
      },
    },
    {
      key: 'vcInTypeCount',
      label: 'VC인타입처수',
      format: 'count',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        if (!kpiData?.vcInTypeCount) return { value: null, prevValue: null }
        const months = getMonths(quarter)
        const cur = kpiData.vcInTypeCount.find(
          (r) => r.year === year && months.includes(r.month))
        const prev = kpiData.vcInTypeCount.find(
          (r) => r.year === prevYear && months.includes(r.month))
        return { value: cur?.value ?? null, prevValue: prev?.value ?? null }
      },
    },
    {
      key: 'marketingAdRatio',
      label: '마케팅/광고비율',
      format: 'percent',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const sales = plAgg?.cur?.[div]?.['매출']
        const mkt = plAgg?.cur?.[div]?.['영업판관비_마케팅비용'] ?? 0
        const ad = plAgg?.cur?.[div]?.['영업판관비_광고비'] ?? 0
        const value = sales > 0 ? (mkt + ad) / sales : null

        const prevSales = plAgg?.yoyPrev?.[div]?.['매출']
        const prevMkt = plAgg?.yoyPrev?.[div]?.['영업판관비_마케팅비용'] ?? 0
        const prevAd = plAgg?.yoyPrev?.[div]?.['영업판관비_광고비'] ?? 0
        const prevValue = prevSales > 0 ? (prevMkt + prevAd) / prevSales : null

        return { value, prevValue }
      },
    },
  ],

  건기식: [
    {
      key: 'directMallSales',
      label: '직영몰매출',
      format: 'amount',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        if (!kpiData?.directMallSales) return { value: null, prevValue: null }
        const months = getMonths(quarter)
        const curRecords = kpiData.directMallSales.filter(
          (r) => r.year === year && months.includes(r.month))
        const prevRecords = kpiData.directMallSales.filter(
          (r) => r.year === prevYear && months.includes(r.month))
        const value = wonToEok(curRecords.reduce((s, r) => s + (r.value || 0), 0))
        const prevValue = wonToEok(prevRecords.reduce((s, r) => s + (r.value || 0), 0))
        return { value, prevValue }
      },
    },
    {
      key: 'daisoSales',
      label: '다이소매출',
      format: 'amount',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        if (!kpiData?.daisoSales) return { value: null, prevValue: null }
        const months = getMonths(quarter)
        const curRecords = kpiData.daisoSales.filter(
          (r) => r.year === year && months.includes(r.month))
        const prevRecords = kpiData.daisoSales.filter(
          (r) => r.year === prevYear && months.includes(r.month))
        const value = wonToEok(curRecords.reduce((s, r) => s + (r.value || 0), 0))
        const prevValue = wonToEok(prevRecords.reduce((s, r) => s + (r.value || 0), 0))
        return { value, prevValue }
      },
    },
    {
      key: 'marketingAdRatio',
      label: '마케팅/광고비율',
      format: 'percent',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const sales = plAgg?.cur?.[div]?.['매출']
        const mkt = plAgg?.cur?.[div]?.['영업판관비_마케팅비용'] ?? 0
        const ad = plAgg?.cur?.[div]?.['영업판관비_광고비'] ?? 0
        const value = sales > 0 ? (mkt + ad) / sales : null

        const prevSales = plAgg?.yoyPrev?.[div]?.['매출']
        const prevMkt = plAgg?.yoyPrev?.[div]?.['영업판관비_마케팅비용'] ?? 0
        const prevAd = plAgg?.yoyPrev?.[div]?.['영업판관비_광고비'] ?? 0
        const prevValue = prevSales > 0 ? (prevMkt + prevAd) / prevSales : null

        return { value, prevValue }
      },
    },
  ],

  나보타: [
    {
      key: 'evolusSales',
      label: '에볼루스매출',
      format: 'amount',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        const value = sumSales(scData, div, year, quarter, (r) => r.productName === 'Evolus')
        const prevValue = sumSales(scData, div, prevYear, quarter, (r) => r.productName === 'Evolus')
        return { value, prevValue }
      },
    },
    {
      key: 'contractCountries',
      label: '계약국가수',
      format: 'count',
      deltaType: 'prevPeriod',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        if (!kpiData?.contractCountries) return { value: null, prevValue: null }
        const months = getMonths(quarter)
        const cur = kpiData.contractCountries.find(
          (r) => r.year === year && months.includes(r.month))
        // 전기比: 직전 분기/년
        let prevVal = null
        if (quarter > 0) {
          const pq = quarter - 1 === 0 ? 4 : quarter - 1
          const py = quarter - 1 === 0 ? year - 1 : year
          const pMonths = getMonths(pq)
          const prev = kpiData.contractCountries.find(
            (r) => r.year === py && pMonths.includes(r.month))
          prevVal = prev?.value ?? null
        } else {
          const prev = kpiData.contractCountries.find(
            (r) => r.year === year - 1 && r.month === 12)
          prevVal = prev?.value ?? null
        }
        return { value: cur?.value ?? null, prevValue: prevVal }
      },
    },
    {
      key: 'launchCountries',
      label: '발매국가수',
      format: 'count',
      deltaType: 'prevPeriod',
      compute: (scData, plAgg, kpiData, div, year, quarter, prevYear) => {
        if (!kpiData?.launchCountries) return { value: null, prevValue: null }
        const months = getMonths(quarter)
        const cur = kpiData.launchCountries.find(
          (r) => r.year === year && months.includes(r.month))
        let prevVal = null
        if (quarter > 0) {
          const pq = quarter - 1 === 0 ? 4 : quarter - 1
          const py = quarter - 1 === 0 ? year - 1 : year
          const pMonths = getMonths(pq)
          const prev = kpiData.launchCountries.find(
            (r) => r.year === py && pMonths.includes(r.month))
          prevVal = prev?.value ?? null
        } else {
          const prev = kpiData.launchCountries.find(
            (r) => r.year === year - 1 && r.month === 12)
          prevVal = prev?.value ?? null
        }
        return { value: cur?.value ?? null, prevValue: prevVal }
      },
    },
  ],

  글로벌: [],
  수탁: [],
}
