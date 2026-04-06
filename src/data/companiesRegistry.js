/**
 * 법인별 기능 플래그 — 어떤 법인이 어떤 상세 데이터를 갖고 있는지 정의
 */
export const COMPANY_CAPABILITIES = {
  '대웅제약': {
    hasDetailedPL: true,      // pl_monthly.json 등 상세 데이터 보유
    hasProductDrilldown: true, // 제품별 드릴다운
    hasExpenseDetail: true,    // 비용 전표 상세
    hasQuarterly: true,        // 분기 분석
    dataPrefix: '',            // 기본 데이터 경로
  },
  // 다른 법인들은 기본값 (상세 데이터 없음)
}

export function getCapabilities(companyName) {
  return COMPANY_CAPABILITIES[companyName] || {
    hasDetailedPL: false,
    hasProductDrilldown: false,
    hasExpenseDetail: false,
    hasQuarterly: false,
    dataPrefix: null,
  }
}

/** 그룹 색상 팔레트 */
export const GROUP_COLORS = {
  계열사그룹: '#1a237e',
  관계사그룹: '#880e4f',
}

/** 주요 법인 색상 (차트에서 사용) */
export const COMPANY_COLORS = [
  '#1a237e', '#1565c0', '#00838f', '#2e7d32', '#f9a825',
  '#ff6f00', '#d84315', '#6a1b9a', '#ad1457', '#37474f',
  '#4e342e', '#00695c', '#283593', '#c62828', '#4527a0',
  '#01579b', '#33691e', '#bf360c', '#880e4f', '#263238',
  '#1b5e20', '#e65100',
]
