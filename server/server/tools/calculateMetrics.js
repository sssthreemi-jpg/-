/**
 * 도구: calculate_metrics — 파생 지표 계산
 * pl_monthly.json 데이터를 우선 사용
 */

const { loadJson } = require('../data/loader');

// 월→분기 매핑
function getMonths(quarter) {
  if (!quarter || quarter === 0) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return [quarter * 3 - 2, quarter * 3 - 1, quarter * 3];
}

/**
 * PL 데이터에서 특정 사업부/연도의 항목 합산
 */
function sumPL(plData, division, year, itemKey, period) {
  let monthSet;
  if (period === 'ytd') {
    const maxMonth = plData
      .filter((e) => e.type === '실적' && e.year === year)
      .reduce((max, e) => Math.max(max, e.month), 0);
    monthSet = new Set(Array.from({ length: maxMonth }, (_, i) => i + 1));
  } else {
    monthSet = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  }

  let total = 0;
  for (const entry of plData) {
    if (entry.type !== '실적') continue;
    if (entry.year !== year) continue;
    if (!monthSet.has(entry.month)) continue;
    const val = entry.items?.[division || '전사']?.[itemKey];
    if (val != null) total += val;
  }
  return total;
}

/**
 * @param {object} input
 * @returns {object} 계산 결과
 */
function calculateMetrics(input) {
  const pl = loadJson('pl_monthly.json');
  const {
    metric_type,
    division = '전사',
    years,
    period = 'yearly',
  } = input;

  const results = [];

  switch (metric_type) {
    case 'cost_rate': {
      // 원가율 = 매출원가 / 매출 × 100
      for (const year of years) {
        const sales = sumPL(pl.data, division, year, '매출', period);
        const cost = sumPL(pl.data, division, year, '매출원가', period);
        results.push({
          year,
          매출: +sales.toFixed(1),
          매출원가: +cost.toFixed(1),
          원가율: sales > 0 ? +((cost / sales) * 100).toFixed(1) : null,
        });
      }
      break;
    }

    case 'growth_rate': {
      // 성장률 = (당기 - 전기) / 전기 × 100
      for (const year of years) {
        const curSales = sumPL(pl.data, division, year, '매출', period);
        const prevSales = sumPL(pl.data, division, year - 1, '매출', period);
        results.push({
          year,
          당기매출: +curSales.toFixed(1),
          전기매출: +prevSales.toFixed(1),
          성장률: prevSales > 0 ? +(((curSales - prevSales) / prevSales) * 100).toFixed(1) : null,
        });
      }
      break;
    }

    case 'target_achievement': {
      // 목표달성률 = 실적 / 목표 × 100 (목표는 2026년만 존재)
      for (const year of years) {
        const actual = sumPL(pl.data, division, year, '매출', period);
        // 목표 데이터 조회
        let target = 0;
        for (const entry of pl.data) {
          if (entry.type !== '목표' || entry.year !== year) continue;
          const val = entry.items?.[division || '전사']?.['매출'];
          if (val != null) target += val;
        }
        results.push({
          year,
          실적매출: +actual.toFixed(1),
          목표매출: +target.toFixed(1),
          달성률: target > 0 ? +((actual / target) * 100).toFixed(1) : null,
        });
      }
      break;
    }

    case 'expense_ratio': {
      // 비용비율 = 비용항목 / 매출 × 100
      const expenseItems = ['영업판관비', '판매대행수수료', '매출변동비', '영업관리비', '일반관리비', '비효율비경상비용', 'R&D비용'];
      for (const year of years) {
        const sales = sumPL(pl.data, division, year, '매출', period);
        const row = { year, 매출: +sales.toFixed(1) };
        for (const item of expenseItems) {
          const val = sumPL(pl.data, division, year, item, period);
          row[item] = +val.toFixed(1);
          row[`${item}_비율`] = sales > 0 ? +((val / sales) * 100).toFixed(1) : null;
        }
        results.push(row);
      }
      break;
    }

    case 'gross_margin': {
      // 매출총이익률 = 매출총이익 / 매출 × 100
      for (const year of years) {
        const sales = sumPL(pl.data, division, year, '매출', period);
        const gp = sumPL(pl.data, division, year, '매출총이익', period);
        results.push({
          year,
          매출: +sales.toFixed(1),
          매출총이익: +gp.toFixed(1),
          매출총이익률: sales > 0 ? +((gp / sales) * 100).toFixed(1) : null,
        });
      }
      break;
    }

    case 'operating_margin': {
      // 영업이익률 = 영업이익 / 매출 × 100
      for (const year of years) {
        const sales = sumPL(pl.data, division, year, '매출', period);
        const op = sumPL(pl.data, division, year, '영업이익', period);
        results.push({
          year,
          매출: +sales.toFixed(1),
          영업이익: +op.toFixed(1),
          영업이익률: sales > 0 ? +((op / sales) * 100).toFixed(1) : null,
        });
      }
      break;
    }

    default:
      return { error: `알 수 없는 지표: ${metric_type}` };
  }

  return {
    metric_type,
    division,
    period,
    unit: '억원 / %',
    data: results,
  };
}

module.exports = calculateMetrics;
