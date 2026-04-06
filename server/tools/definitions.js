/**
 * Claude Tool Use 도구 정의 — chatbot-design.md 6.1장 기반
 */

const TOOL_DEFINITIONS = [
  // ─── 도구 1: 손익 데이터 조회 ───
  {
    name: 'query_pl_data',
    description: `전사 또는 사업부별 손익계산서 데이터를 조회합니다.
조회 가능 항목: 매출, 매출원가, 매출원가율, 매출총이익, 영업판관비, 판매대행수수료,
매출변동비, 영업관리비, 일반관리비, 비효율비경상비용, R&D비용, R&D차감전이익, 영업이익 등 44개 항목.
조회 가능 연도: 2020~2026 (목표 데이터는 2026만 존재).
데이터 단위: 억원.
이 도구의 결과는 pl_monthly.json 기반으로 가장 신뢰도가 높습니다.`,
    input_schema: {
      type: 'object',
      properties: {
        division: {
          type: 'string',
          description: "사업부명. '전사', 'ETC', 'CH', '건기식', '나보타', '글로벌', '수탁', '기타' 중 하나",
          enum: ['전사', 'ETC', 'CH', '건기식', '나보타', '글로벌', '수탁', '기타'],
        },
        years: {
          type: 'array',
          items: { type: 'integer' },
          description: '조회할 연도 목록 (예: [2024, 2025, 2026])',
        },
        quarters: {
          type: 'array',
          items: { type: 'integer' },
          description: '특정 분기만 조회 시 (예: [1, 2]). 생략하면 전체 분기',
        },
        months: {
          type: 'array',
          items: { type: 'integer' },
          description: '특정 월만 조회 시 (예: [1, 2, 3]). 생략하면 전체 월',
        },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: '조회할 손익 항목명 목록. 생략하면 주요 항목(매출, 매출원가, 매출총이익, 영업이익) 반환',
        },
        data_type: {
          type: 'string',
          enum: ['실적', '목표', 'both'],
          description: "실적/목표/둘다. 기본값 '실적'. 목표는 2026년만 존재",
        },
        aggregation: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'yearly'],
          description: "집계 단위. 기본값 'yearly'",
        },
      },
      required: ['division', 'years'],
    },
  },

  // ─── 도구 2: 매출/원가 품목별 조회 ───
  {
    name: 'query_sales_cost',
    description: `사업부별 품목 단위 매출·원가 데이터를 조회합니다.
드릴다운 계층:
- ETC: productType → category → profitTier → productGroup → productName
- CH/건기식: category → productGroup → productName
- 나보타: category(국내/수출) → productGroup → productName
- 글로벌: category(국가/채널) → productGroup → productName
- 수탁: category(수탁구분) → productGroup → productName
원본 단위: 원 (억원 변환은 서버에서 자동 처리).
특정 품목의 상세 매출/원가/원가율을 확인할 때 사용합니다.`,
    input_schema: {
      type: 'object',
      properties: {
        division: {
          type: 'string',
          enum: ['ETC', 'CH', '건기식', '나보타', '글로벌', '수탁'],
        },
        years: {
          type: 'array',
          items: { type: 'integer' },
          description: '조회 연도 목록',
        },
        productType: {
          type: 'string',
          description: 'ETC 전용. 제품유형 필터',
        },
        category: {
          type: 'string',
          description: "중분류 필터 (예: '기타품목', '수출')",
        },
        profitTier: {
          type: 'string',
          description: 'ETC 전용. 수익군 필터',
        },
        productGroup: {
          type: 'string',
          description: "품목군 필터 (예: '펙수클루', '나보타')",
        },
        productName: {
          type: 'string',
          description: '개별 품목명 필터',
        },
        aggregation: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'yearly'],
          description: "집계 단위. 기본값 'yearly'",
        },
        top_n: {
          type: 'integer',
          description: '매출 상위 N개 품목만 반환. 기본값: 전체',
        },
      },
      required: ['division', 'years'],
    },
  },

  // ─── 도구 3: 비용 상세 조회 ───
  {
    name: 'query_expense_detail',
    description: `비용 전표 상세 데이터를 조회합니다.
조회 가능 연도: 2022~2025만 (2020~2021, 2026은 없음).
계층: category2(대분류) → category3(세부항목) → bizUnit(사업구분: 직접/공통).
대분류 예시: 영업판관비, 판매대행수수료, 매출변동비, 영업관리비, 일반관리비, 비효율비경상비용, R&D비용.
금액 단위: 원 (억원 변환은 서버에서 자동 처리).`,
    input_schema: {
      type: 'object',
      properties: {
        years: {
          type: 'array',
          items: { type: 'integer' },
          description: '조회 연도 (2022~2025만 가능)',
        },
        category2: {
          type: 'string',
          description: '비용 대분류 필터',
        },
        category3: {
          type: 'string',
          description: '비용 세부항목 필터',
        },
        bizUnit: {
          type: 'string',
          description: '사업구분 필터 (ETC, CH, 건기식, 나보타, 글로벌, 수탁, 공통)',
        },
        aggregation: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'yearly'],
          description: "집계 단위. 기본값 'yearly'",
        },
      },
      required: ['years'],
    },
  },

  // ─── 도구 4: 지표 계산 ───
  {
    name: 'calculate_metrics',
    description: `파생 지표를 계산합니다. 원가율, 성장률, 목표달성률, 비용비율 등.
복합 계산이 필요할 때 사용합니다.`,
    input_schema: {
      type: 'object',
      properties: {
        metric_type: {
          type: 'string',
          enum: [
            'cost_rate',
            'growth_rate',
            'target_achievement',
            'expense_ratio',
            'gross_margin',
            'operating_margin',
          ],
          description: '계산할 지표 유형',
        },
        division: {
          type: 'string',
          description: '사업부명',
        },
        productGroup: {
          type: 'string',
          description: '품목군 (원가율 계산 시)',
        },
        years: {
          type: 'array',
          items: { type: 'integer' },
        },
        period: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'yearly', 'ytd'],
          description: '집계 기간. ytd = 연초~현재월 누적',
        },
      },
      required: ['metric_type', 'years'],
    },
  },

  // ─── 도구 5: 차트 데이터 생성 ───
  {
    name: 'generate_chart',
    description: `데이터를 시각화할 차트 데이터를 생성합니다.
사용자가 추이, 비교, 구성비 등을 물어볼 때 적절한 차트를 함께 제공합니다.
차트 종류는 데이터 특성에 맞게 자동 선택합니다.`,
    input_schema: {
      type: 'object',
      properties: {
        chart_type: {
          type: 'string',
          enum: ['line', 'bar', 'stacked_bar', 'pie', 'composed'],
          description: '차트 유형. line=추이, bar=비교, stacked_bar=구성, pie=비율, composed=복합',
        },
        title: {
          type: 'string',
          description: '차트 제목',
        },
        data: {
          type: 'array',
          description: '차트 데이터 배열. 각 항목은 { name, ...values } 형태',
        },
        x_key: {
          type: 'string',
          description: 'X축 데이터 키',
        },
        y_keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Y축 데이터 키 목록',
        },
        y_label: {
          type: 'string',
          description: "Y축 레이블 (예: '억원', '%')",
        },
      },
      required: ['chart_type', 'title', 'data', 'x_key', 'y_keys'],
    },
  },
];

module.exports = TOOL_DEFINITIONS;
