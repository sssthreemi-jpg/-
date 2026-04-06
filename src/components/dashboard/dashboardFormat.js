/**
 * 대시보드용 숫자 포맷 (억원 단위)
 * - |v| > 1: 정수 표시 (예: 100, -50)
 * - |v| <= 1: 소수 1자리 (예: 0.3, -0.3)
 */
export function fmtDashboard(value) {
  if (value == null) return '-'
  const abs = Math.abs(value)
  if (abs > 1) {
    return Math.round(value).toLocaleString('ko-KR')
  }
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/**
 * 대시보드용 증감 포맷
 */
export function fmtDashboardDelta(value) {
  if (value == null) return '-'
  const sign = value > 0 ? '(+)' : value < 0 ? '(-)' : ''
  const abs = Math.abs(value)
  if (abs > 1) {
    return sign + Math.round(abs).toLocaleString('ko-KR')
  }
  return sign + abs.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}
