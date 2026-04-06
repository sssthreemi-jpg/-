/**
 * 신호등 상태 계산
 *
 * @param {number} currentSales - 당기 매출
 * @param {number} yoySales - 전년동기 매출
 * @param {number} prevSales - 직전기 매출
 * @param {number[]} prev3Sales - 직전 3기 매출 배열 [oldest, ..., newest] (직전4기~직전2기)
 *   직전 3기 평균성장률 계산을 위해 실제로는 4개 기간이 필요:
 *   prev3Sales[0]→prev3Sales[1], prev3Sales[1]→prev3Sales[2], prev3Sales[2]→prevSales
 * @returns {'blue'|'yellow'|'red'}
 */
export function computeTrafficLight(currentSales, yoySales, prevSales, prev3Sales) {
  // 조건1: 전년동기 比 성장
  const cond1 = yoySales != null && yoySales > 0 && currentSales > yoySales

  // 조건2: 전기대비 성장률 > 직전 3기 평균성장률
  let cond2 = false
  if (prevSales != null && prevSales !== 0 && prev3Sales && prev3Sales.length === 3) {
    const currentGrowth = (currentSales - prevSales) / Math.abs(prevSales)

    // 직전 3기의 전기대비 성장률 계산
    // prev3Sales = [t-4, t-3, t-2], prevSales = t-1
    const growthRates = []
    const chain = [...prev3Sales, prevSales]
    for (let i = 1; i < chain.length; i++) {
      if (chain[i - 1] != null && chain[i - 1] !== 0 && chain[i] != null) {
        growthRates.push((chain[i] - chain[i - 1]) / Math.abs(chain[i - 1]))
      }
    }

    if (growthRates.length > 0) {
      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      cond2 = currentGrowth > avgGrowth
    }
  }

  if (cond1 && cond2) return 'blue'
  if (cond1 || cond2) return 'yellow'
  return 'red'
}

/** 신호등 색상 CSS 클래스 */
export const TRAFFIC_COLORS = {
  blue: 'text-blue-600',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
}

export const TRAFFIC_BG = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}
