/** 억원 단위 숫자 포맷 (|값|>1 정수, |값|≤1 소수1자리) */
export function fmtBillion(value) {
  if (value == null) return '-'
  if (Math.abs(value) > 1) {
    return Math.round(value).toLocaleString('ko-KR')
  }
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/** 비율 포맷 (51.4%) */
export function fmtPercent(value) {
  if (value == null) return '-'
  return (value * 100).toFixed(1) + '%'
}

/** 원 → 억원 변환 */
export function wonToEok(value) {
  if (value == null) return null
  return value / 1_0000_0000
}

/** 증감 CSS 클래스 (증가=파랑, 감소=빨강) */
export function changeClass(diff) {
  if (diff == null || diff === 0) return ''
  return diff > 0 ? 'text-increase' : 'text-decrease'
}

/** 비율 포맷 (소수점 1자리 %) - 0~1 범위 입력 */
export function fmtRatio(value) {
  if (value == null || !isFinite(value)) return '-'
  return (value * 100).toFixed(1) + '%'
}

/** 증감 포맷 (+/- 접두어, |값|>1 정수, |값|≤1 소수1자리) */
export function fmtDelta(value) {
  if (value == null) return '-'
  const sign = value > 0 ? '(+)' : value < 0 ? '(-)' : ''
  const abs = Math.abs(value)
  const num = abs > 1
    ? Math.round(abs).toLocaleString('ko-KR')
    : abs.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return sign + num
}

/** 증감 %p 포맷 */
export function fmtDeltaPp(value) {
  if (value == null || !isFinite(value)) return '-'
  const pp = value * 100
  const sign = pp > 0 ? '(+)' : pp < 0 ? '(-)' : ''
  return sign + Math.abs(pp).toFixed(1) + '%p'
}

/** 증감 색상 (null/0=회색, 양=파랑, 음=빨강) */
export function deltaClass(value) {
  if (value == null || value === 0) return 'text-gray-400'
  return value > 0 ? 'text-increase' : 'text-decrease'
}
