/** 그룹 대시보드용 포맷 유틸리티 */

/** 억원 단위 포맷 (1,234) */
export function fmt(v, decimals = 0) {
  if (v == null || isNaN(v)) return '-'
  return v.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** 성장률 포맷 (+12.3%) */
export function fmtGrowth(v) {
  if (v == null || isNaN(v)) return '-'
  const pct = (v * 100).toFixed(1)
  return (v >= 0 ? '+' : '') + pct + '%'
}

/** 지표 값 포맷 (비율이면 %, 아니면 숫자) */
export function fmtInd(v, isRate) {
  if (v == null || v === undefined) return '-'
  if (typeof v !== 'number') return String(v)
  if (isRate) return (v * 100).toFixed(1) + '%'
  if (Math.abs(v) >= 10000) return fmt(v, 0)
  if (Math.abs(v) >= 100) return fmt(v, 0)
  if (Math.abs(v) >= 1) return fmt(v, 1)
  return v.toFixed(3)
}

/** 성장률 색상 클래스 */
export function growthClass(v) {
  if (v == null) return 'text-gray-400'
  return v >= 0 ? 'text-green-600' : 'text-red-600'
}

/** 성장률 뱃지 */
export function growthBadge(v) {
  if (v == null) return '-'
  const cls = v >= 0
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700'
  return { text: fmtGrowth(v), className: cls }
}
