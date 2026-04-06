/**
 * 도구: query_sales_cost — sales_cost_summary.json 조회
 */

const { loadJson } = require('../data/loader');

/**
 * @param {object} input - Claude가 전달한 도구 입력
 * @returns {object} 조회 결과
 */
function querySalesCost(input) {
  const sc = loadJson('sales_cost_summary.json');
  const {
    division,
    years,
    productType,
    category,
    profitTier,
    productGroup,
    productName,
    aggregation = 'yearly',
    top_n,
  } = input;

  // 1. 필터링 (js-index-maps: 연도+사업부 인덱스로 빠른 1차 필터)
  if (!sc._divYearIndex) {
    sc._divYearIndex = new Map();
    for (const row of sc.data) {
      const key = `${row.division}|${row.year}`;
      if (!sc._divYearIndex.has(key)) sc._divYearIndex.set(key, []);
      sc._divYearIndex.get(key).push(row);
    }
  }

  // 인덱스 활용 1차 필터
  let preFiltered = [];
  for (const year of years) {
    const key = `${division}|${year}`;
    const rows = sc._divYearIndex.get(key);
    if (rows) preFiltered.push(...rows);
  }

  // 나머지 필터는 이미 줄어든 데이터셋에서 처리
  let filtered = preFiltered.filter((row) => {
    if (productType && row.productType !== productType) return false;
    if (category && row.category !== category) return false;
    if (profitTier && row.profitTier !== profitTier) return false;
    if (productGroup && !row.productGroup?.includes(productGroup)) return false;
    if (productName && !row.productName?.includes(productName)) return false;
    return true;
  });

  // 2. 집계 키 결정
  // 품목별 필터가 있으면 기간별로만 집계, 없으면 품목별로도 그룹핑
  const hasProductFilter = productGroup || productName;

  const grouped = {};

  for (const row of filtered) {
    let periodKey;
    if (aggregation === 'monthly') periodKey = `${row.year}-${String(row.month).padStart(2, '0')}`;
    else if (aggregation === 'quarterly') periodKey = `${row.year}-Q${row.quarter}`;
    else periodKey = `${row.year}`;

    // 품목 필터가 없으면 품목별 그룹핑
    const groupKey = hasProductFilter
      ? periodKey
      : `${periodKey}|${row.productGroup || '(미분류)'}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        period: periodKey,
        productGroup: hasProductFilter ? (productGroup || productName || division) : (row.productGroup || '(미분류)'),
        sales: 0,
        cost: 0,
      };
    }
    grouped[groupKey].sales += row.sales || 0;
    grouped[groupKey].cost += row.cost || 0;
  }

  // 3. 원→억원 변환 + 원가율 계산
  let result = Object.values(grouped)
    .map((g) => ({
      period: g.period,
      productGroup: g.productGroup,
      sales_억원: +(g.sales / 1e8).toFixed(1),
      cost_억원: +(g.cost / 1e8).toFixed(1),
      cost_rate: g.sales > 0 ? +((g.cost / g.sales) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => {
      // 기간별 정렬 후 매출 내림차순
      const cmp = a.period.localeCompare(b.period);
      if (cmp !== 0) return cmp;
      return b.sales_억원 - a.sales_억원;
    });

  // 4. 상위 N개 필터 (품목별 그룹핑일 때)
  if (top_n && !hasProductFilter) {
    // 기간별로 상위 N개만 추출
    const byPeriod = {};
    for (const row of result) {
      if (!byPeriod[row.period]) byPeriod[row.period] = [];
      byPeriod[row.period].push(row);
    }
    result = [];
    for (const rows of Object.values(byPeriod)) {
      result.push(...rows.sort((a, b) => b.sales_억원 - a.sales_억원).slice(0, top_n));
    }
  }

  return {
    division,
    filters: { productType, category, profitTier, productGroup, productName },
    aggregation,
    unit: '억원',
    count: result.length,
    data: result,
  };
}

module.exports = querySalesCost;
