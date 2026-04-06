/**
 * 도구: query_pl_data — pl_monthly.json 조회
 */

const { loadJson } = require('../data/loader');

// 기본 조회 항목
const DEFAULT_ITEMS = ['매출', '매출원가', '매출총이익', '영업이익'];

/**
 * @param {object} input - Claude가 전달한 도구 입력
 * @returns {object} 조회 결과
 */
function queryPLData(input) {
  const pl = loadJson('pl_monthly.json');
  const {
    division,
    years,
    quarters,
    months,
    items = DEFAULT_ITEMS,
    data_type = '실적',
    aggregation = 'yearly',
  } = input;

  // 1. 필터링 (Set 기반 O(1) lookup)
  const yearSet = new Set(years);
  const quarterSet = quarters ? new Set(quarters) : null;
  const monthSet = months ? new Set(months) : null;

  let filtered = pl.data.filter((entry) => {
    if (data_type !== 'both' && entry.type !== data_type) return false;
    if (!yearSet.has(entry.year)) return false;
    if (quarterSet && !quarterSet.has(entry.quarter)) return false;
    if (monthSet && !monthSet.has(entry.month)) return false;
    return true;
  });

  // 2. 집계
  const grouped = {};

  for (const entry of filtered) {
    let key;
    if (aggregation === 'monthly') key = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
    else if (aggregation === 'quarterly') key = `${entry.year}-Q${entry.quarter}`;
    else key = `${entry.year}`;

    // 실적/목표 구분 포함
    if (data_type === 'both') key = `${key}(${entry.type})`;

    if (!grouped[key]) {
      grouped[key] = { period: key };
      for (const item of items) grouped[key][item] = 0;
    }

    const divData = entry.items?.[division];
    if (!divData) continue;

    for (const item of items) {
      const val = divData[item];
      if (val != null) grouped[key][item] += val;
    }
  }

  // 3. 소수점 정리 + 정렬
  const result = Object.values(grouped)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => {
      const cleaned = { period: row.period };
      for (const item of items) {
        cleaned[item] = +(row[item] || 0).toFixed(1);
      }
      return cleaned;
    });

  return {
    division,
    items,
    aggregation,
    unit: '억원',
    count: result.length,
    data: result,
  };
}

module.exports = queryPLData;
