// 사업부 목록 (전사 제외)
export const DIVISIONS = ['ETC', 'CH', '건기식', '나보타', '글로벌', '수탁']

// 사업부별 차트 색상
export const DIVISION_COLORS = {
  ETC: '#F5A623',
  CH: '#4CAF50',
  건기식: '#2196F3',
  나보타: '#9C27B0',
  글로벌: '#FF5722',
  수탁: '#607D8B',
  기타: '#795548',
  전사: '#1A1A1A',
}

// 44개 손익 항목 순서
export const PL_ITEMS = [
  { key: '매출', label: '매출', level: 0 },
  { key: '매출_국내', label: '매출(국내)', level: 1 },
  { key: '매출_수출', label: '매출(수출)', level: 1 },
  { key: '매출원가', label: '매출원가', level: 0 },
  { key: '폐기비용', label: '폐기비용', level: 1 },
  { key: '매출총이익', label: '매출총이익', level: 0, highlight: true },
  { key: '영업판관비', label: '영업판관비', level: 0 },
  { key: '영업판관비_영업비용', label: '영업비용', level: 1 },
  { key: '영업판관비_마케팅비용', label: '마케팅비용', level: 1 },
  { key: '영업판관비_영업직접비', label: '영업직접비', level: 1 },
  { key: '영업판관비_영업인건비', label: '영업인건비', level: 1 },
  { key: '영업판관비_마케팅인건비', label: '마케팅인건비', level: 1 },
  { key: '영업판관비_광고비', label: '광고비', level: 1 },
  { key: '판매대행수수료', label: '판매대행수수료', level: 0 },
  { key: '판매대행수수료_국내', label: '국내 판매대행', level: 1 },
  { key: '판매대행수수료_해외', label: '해외 판매대행', level: 1 },
  { key: '매출변동비', label: '매출변동비', level: 0 },
  { key: '매출변동비_운반비', label: '운반비', level: 1 },
  { key: '매출변동비_쇼핑몰수수료', label: '쇼핑몰수수료', level: 1 },
  { key: '매출변동비_OTC로열티', label: 'OTC로열티', level: 1 },
  { key: '매출변동비_ETC로열티', label: 'ETC로열티', level: 1 },
  { key: '매출변동비_EGF로열티', label: 'EGF로열티', level: 1 },
  { key: '매출변동비_카드수수료', label: '카드수수료', level: 1 },
  { key: '영업관리비', label: '영업관리비', level: 0 },
  { key: '영업관리비_인건비', label: '인건비', level: 1 },
  { key: '영업관리비_지사운영비', label: '지사운영비', level: 1 },
  { key: '영업관리비_감가상각비', label: '감가상각비', level: 1 },
  { key: '영업관리비_기타경비', label: '기타경비', level: 1 },
  { key: '일반관리비', label: '일반관리비', level: 0 },
  { key: '일반관리비_인건비', label: '인건비', level: 1 },
  { key: '일반관리비_대웅용역료', label: '대웅용역료', level: 1 },
  { key: '일반관리비_감가상각비', label: '감가상각비', level: 1 },
  { key: '일반관리비_IT비용', label: 'IT비용', level: 1 },
  { key: '일반관리비_세금과공과', label: '세금과공과', level: 1 },
  { key: '일반관리비_지급수수료', label: '지급수수료', level: 1 },
  { key: '일반관리비_기타경비', label: '기타경비', level: 1 },
  { key: '비효율비경상비용', label: '기타비용', level: 0 },
  { key: '비효율비경상비용_소송비용', label: '소송비용', level: 1 },
  { key: '비효율비경상비용_대손상각비', label: '대손상각비', level: 1 },
  { key: 'R&D차감전이익', label: 'R&D차감전이익', level: 0, highlight: true },
  { key: 'R&D비용', label: 'R&D비용', level: 0 },
  { key: 'R&D비용_R연구', label: 'R(연구)', level: 1 },
  { key: 'R&D비용_D개발', label: 'D(개발)', level: 1 },
  { key: '영업이익', label: '영업이익', level: 0, highlight: true },
]

// 소계/합계 행 (굵게 표시)
export const HEADER_ITEMS = new Set([
  '매출', '매출원가', '매출총이익', '영업판관비', '판매대행수수료',
  '매출변동비', '영업관리비', '일반관리비', '비효율비경상비용',
  'R&D차감전이익', 'R&D비용', '영업이익',
])
