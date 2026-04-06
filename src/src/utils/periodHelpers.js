import { PL_ITEMS, DIVISIONS } from './constants'

/** 분기에 해당하는 월 목록 (0=연간: 1~12) */
export function getMonths(quarter) {
  if (quarter === 0) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  return [quarter * 3 - 2, quarter * 3 - 1, quarter * 3]
}

/** 특정 연도/분기의 전체 사업부 합산 */
export function aggregate(data, yr, quarter) {
  const months = getMonths(quarter)
  const entries = data.filter(
    (e) => e.type === '실적' && e.year === yr && months.includes(e.month),
  )
  if (entries.length === 0) return null

  const result = {}
  const allDivs = ['전사', ...DIVISIONS]
  allDivs.forEach((div) => {
    result[div] = {}
    PL_ITEMS.forEach(({ key }) => {
      result[div][key] = entries.reduce((acc, e) => {
        const v = e.items?.[div]?.[key]
        return v != null ? acc + v : acc
      }, 0)
    })
  })
  return result
}

/** 직전 N분기 리스트 (오래된 순) */
export function prevQuarters(year, quarter, n) {
  const list = []
  let y = year
  let q = quarter
  for (let i = 0; i < n; i++) {
    q -= 1
    if (q === 0) { q = 4; y -= 1 }
    list.unshift({ year: y, quarter: q })
  }
  return list
}

/** 추이 데이터 생성 (최근 N분기 집계 배열) */
export function buildTrendData(data, year, quarter, n = 8) {
  const shortYear = (y) => String(y).slice(2)
  const quarters = prevQuarters(year, quarter, n - 1)
  quarters.push({ year, quarter })
  return quarters.map(({ year: y, quarter: q }) => ({
    label: `${shortYear(y)}.${q}Q`,
    year: y,
    quarter: q,
    agg: aggregate(data, y, q),
  }))
}

/** 기간 열 정의 + 전년동기 데이터 반환 */
export function buildPeriodCols(data, year, quarter) {
  const shortYear = (y) => String(y).slice(2)

  if (quarter > 0) {
    const cur = aggregate(data, year, quarter)
    const prev = aggregate(data, year - 1, quarter)
    const prev3 = prevQuarters(year, quarter, 3).map(
      (p) => ({ ...p, agg: aggregate(data, p.year, p.quarter) }),
    )
    const periodCols = [
      { label: `${shortYear(year - 1)}.${quarter}Q`, agg: prev },
      ...prev3.map((p) => ({
        label: `${shortYear(p.year)}.${p.quarter}Q`,
        agg: p.agg,
      })),
      { label: `${shortYear(year)}.${quarter}Q`, agg: cur, isCurrent: true },
    ]
    return { mode: 'quarter', cur, prev, prev3, periodCols, yoyPrev: prev }
  } else {
    const cur = aggregate(data, year, 0)
    const prevYears = [year - 3, year - 2, year - 1].map((y) => ({
      year: y, agg: aggregate(data, y, 0),
    }))
    const prevYear = aggregate(data, year - 1, 0)
    const periodCols = [
      ...prevYears.map((p) => ({
        label: `${shortYear(p.year)}년`,
        agg: p.agg,
      })),
      { label: `${shortYear(year)}년`, agg: cur, isCurrent: true },
    ]
    return { mode: 'annual', cur, prevYears, prevYear, periodCols, yoyPrev: prevYear }
  }
}
