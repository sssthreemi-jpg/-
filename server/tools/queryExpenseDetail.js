/**
 * 도구: query_expense_detail — expense_detail.json 조회
 */

const { loadJson } = require('../data/loader');

/**
 * @param {object} input - Claude가 전달한 도구 입력
 * @returns {object} 조회 결과
 */
function queryExpenseDetail(input) {
  const expense = loadJson('expense_detail.json');
  const {
    years,
    category2,
    category3,
    bizUnit,
    aggregation = 'yearly',
  } = input;

  // 연도 범위 검증 (2022~2025만 존재)
  const validYears = years.filter((y) => y >= 2022 && y <= 2025);
  if (validYears.length === 0) {
    return {
      error: '비용 상세 데이터는 2022~2025년만 존재합니다.',
      available_years: [2022, 2023, 2024, 2025],
    };
  }

  // 1. 필터링 (Set 기반 O(1) lookup)
  const yearSet = new Set(validYears);

  let filtered = expense.data.filter((row) => {
    if (!yearSet.has(row.year)) return false;
    if (category2 && row.category2 !== category2) return false;
    if (category3 && row.category3 !== category3) return false;
    if (bizUnit && row.bizUnit !== bizUnit) return false;
    return true;
  });

  // 2. 그룹핑 키 결정
  const hasDetailFilter = category3 || bizUnit;

  const grouped = {};

  for (const row of filtered) {
    let periodKey;
    if (aggregation === 'monthly') periodKey = `${row.year}-${String(row.month).padStart(2, '0')}`;
    else if (aggregation === 'quarterly') {
      const q = Math.ceil(row.month / 3);
      periodKey = `${row.year}-Q${q}`;
    } else periodKey = `${row.year}`;

    // 세부 필터가 없으면 category2 또는 category3별로 그룹핑
    let groupLabel;
    if (hasDetailFilter) {
      groupLabel = bizUnit || category3 || category2 || '전체';
    } else if (category2) {
      groupLabel = row.category3 || '(미분류)';
    } else {
      groupLabel = row.category2 || '(미분류)';
    }

    const groupKey = `${periodKey}|${groupLabel}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        period: periodKey,
        category: groupLabel,
        amount: 0,
      };
    }
    grouped[groupKey].amount += row.amount || 0;
  }

  // 3. 원→억원 변환 + 정렬
  const result = Object.values(grouped)
    .map((g) => ({
      period: g.period,
      category: g.category,
      amount_억원: +(g.amount / 1e8).toFixed(1),
    }))
    .sort((a, b) => {
      const cmp = a.period.localeCompare(b.period);
      if (cmp !== 0) return cmp;
      return Math.abs(b.amount_억원) - Math.abs(a.amount_억원);
    });

  return {
    filters: { category2, category3, bizUnit },
    years: validYears,
    aggregation,
    unit: '억원',
    count: result.length,
    data: result,
  };
}

module.exports = queryExpenseDetail;
