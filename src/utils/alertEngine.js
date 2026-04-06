/**
 * 이슈/알림 자동 생성 엔진 — 원본 대시보드 로직 포팅
 */

/** 회사별 알림 생성 */
export function generateAlerts(company) {
  const alerts = []
  const c = company
  const rev = c.revenue, op = c.operatingProfit
  const ci = c.commonIndicators || [], ii = c.individualIndicators || []

  // 영업적자
  if (op?.y25 != null && op.y25 < 0) {
    const wasProfitable = op.y24 > 0
    alerts.push({
      type: 'critical',
      area: '영업이익',
      msg: wasProfitable
        ? `영업이익 ${Math.round(op.y24)}억 → ${Math.round(op.y25)}억으로 <strong>적자 전환</strong>`
        : `영업적자 ${Math.round(op.y25)}억 지속`,
      metric: '영업이익',
      isRate: false,
      values: { y22: op.y22, y23: op.y23, y24: op.y24, y25: op.y25 },
    })
  }

  // 매출 급감 (>15%)
  if (rev?.y25 && rev?.y24 && rev.y24 > 0) {
    const rg = (rev.y25 - rev.y24) / rev.y24
    if (rg < -0.15) {
      alerts.push({
        type: 'critical',
        area: '매출',
        msg: `매출액 ${Math.round(rev.y24)}억 → ${Math.round(rev.y25)}억, <strong>${(rg * 100).toFixed(1)}% 급감</strong>`,
        metric: '매출액',
        isRate: false,
        values: { y22: rev.y22, y23: rev.y23, y24: rev.y24, y25: rev.y25 },
      })
    } else if (rg < -0.05) {
      alerts.push({
        type: 'warning',
        area: '매출',
        msg: `매출액 전년대비 ${(rg * 100).toFixed(1)}% 감소 (${Math.round(rev.y24)}→${Math.round(rev.y25)}억)`,
        metric: '매출액',
        isRate: false,
        values: { y22: rev.y22, y23: rev.y23, y24: rev.y24, y25: rev.y25 },
      })
    }
  }

  // 영업이익 급감 (>20%, 흑자인 경우)
  if (op?.y25 >= 0 && op?.y24 > 0) {
    const og = (op.y25 - op.y24) / op.y24
    if (og < -0.2) {
      alerts.push({
        type: 'warning',
        area: '영업이익',
        msg: `영업이익 ${Math.round(op.y24)}→${Math.round(op.y25)}억, <strong>${(og * 100).toFixed(1)}% 급감</strong>`,
        metric: '영업이익',
        isRate: false,
        values: { y22: op.y22, y23: op.y23, y24: op.y24, y25: op.y25 },
      })
    }
  }

  // 다년간 매출 하향 추세
  if (rev?.y22 && rev?.y23 && rev?.y24 && rev?.y25) {
    if (rev.y23 < rev.y22 && rev.y24 < rev.y23 && rev.y25 < rev.y24) {
      alerts.push({
        type: 'warning',
        area: '매출',
        msg: '매출 <strong>3년 연속 하락</strong> 추세',
        metric: '매출액',
        isRate: false,
        values: { y22: rev.y22, y23: rev.y23, y24: rev.y24, y25: rev.y25 },
      })
    }
  }

  // 영업이익률 지속 하락
  const opmI = ci.find(i => i.label.includes('영업이익률'))
  if (opmI?.values) {
    const v = opmI.values
    if (v.y23 < v.y22 && v.y24 < v.y23 && v.y25 < v.y24) {
      alerts.push({
        type: 'warning',
        area: '수익성',
        msg: `영업이익률 <strong>3년 연속 하락</strong> (${(v.y22 * 100).toFixed(1)}%→${(v.y25 * 100).toFixed(1)}%)`,
        metric: '영업이익률',
        isRate: true,
        values: v,
      })
    }
  }

  // 원가율 상승
  const costI = ci.find(i => i.label.includes('원가율'))
  if (costI?.values?.y24 && costI?.values?.y25) {
    const diff = costI.values.y25 - costI.values.y24
    if (diff > 0.03) {
      alerts.push({
        type: 'warning',
        area: '원가',
        msg: `원가율 ${(costI.values.y24 * 100).toFixed(1)}%→${(costI.values.y25 * 100).toFixed(1)}% <strong>${(diff * 100).toFixed(1)}%p 상승</strong>`,
        metric: '원가율',
        isRate: true,
        values: costI.values,
      })
    }
  }

  // 판관비율 급증
  const sgaI = ci.find(i => i.label.includes('판관비'))
  if (sgaI?.values?.y24 && sgaI?.values?.y25) {
    const diff = sgaI.values.y25 - sgaI.values.y24
    if (diff > 0.03) {
      alerts.push({
        type: 'warning',
        area: '비용',
        msg: `판관비율 ${(sgaI.values.y24 * 100).toFixed(1)}%→${(sgaI.values.y25 * 100).toFixed(1)}% <strong>${(diff * 100).toFixed(1)}%p 상승</strong>`,
        metric: '판관비율',
        isRate: true,
        values: sgaI.values,
      })
    }
  }

  return alerts
}

/** 핵심 이슈만 필터 */
export function isKeyAlert(a) {
  if (a.type === 'critical') return true
  if (a.type === 'warning') {
    if (a.area === '영업이익') return true
    if (a.area === '매출' && a.msg.includes('감소') && !a.msg.includes('추세')) return true
    if (a.msg.includes('적자')) return true
    return false
  }
  return false
}

/** 심각도 점수 계산 */
export function calcSeverityScore(alerts) {
  return alerts.reduce((s, a) => {
    if (a.type === 'critical') return s + 3
    if (a.type === 'warning') return s + 1
    return s
  }, 0)
}

/** 회사 목록에 알림 부착 후 이슈 회사만 반환 */
export function getAlertCompanies(companies) {
  return companies
    .map(c => {
      const allAlerts = generateAlerts(c)
      const keyAlerts = allAlerts.filter(isKeyAlert)
      return {
        ...c,
        alerts: keyAlerts,
        totalScore: calcSeverityScore(keyAlerts),
        severity: {
          critical: keyAlerts.filter(a => a.type === 'critical').length,
          warning: keyAlerts.filter(a => a.type === 'warning').length,
        },
      }
    })
    .filter(c => c.alerts.length > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
}
