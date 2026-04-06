import { wonToEok } from './formatters'
import { getMonths } from './periodHelpers'

/**
 * 사업부별 주요품목 선정 규칙
 * resolve 함수: (scData, division, year, quarter) → [{name, displayName?, ...extra}]
 */
export const KEY_PRODUCTS_CONFIG = {
  ETC: {
    field: 'productGroup',
    alwaysInclude: ['펙수클루', '엔블로'],
    resolve: (rows) => {
      const always = rows.filter((r) => ['펙수클루', '엔블로'].includes(r.name))
      const rest = rows
        .filter((r) => !['펙수클루', '엔블로'].includes(r.name))
        .slice(0, 8)
      return [...always, ...rest].sort((a, b) => b.sales - a.sales)
    },
  },

  CH: {
    field: 'productGroup',
    filterCategory: '명품군',
    mergeRules: {
      '우루사': ['알파우루사', '우루사(O)'],
    },
    fixedItems: ['우루사', '임팩타민', '이지엔6', '베아제', '이지덤'],
    resolve: (rows) => rows,
  },

  건기식: {
    field: 'productName',
    topN: 5,
    resolve: (rows) => rows.slice(0, 5),
  },

  나보타: {
    field: 'custom',
    customItems: [
      {
        name: 'Evolus',
        filter: (r) => r.productName === 'Evolus',
      },
      {
        name: '브라질',
        filter: (r) => r.productGroup === '브라질',
      },
      {
        name: '태국',
        filter: (r) => r.productGroup === '태국',
      },
      {
        name: '사우디아라비아',
        filter: (r) => r.productGroup === '사우디아라비아',
      },
      {
        name: '국내 나보타',
        filter: (r) => r.category === '국내' && r.productGroup === '나보타',
      },
    ],
    resolve: (rows) => rows,
  },

  글로벌: {
    field: 'custom',
    customItems: [
      {
        name: '펙수클루',
        filter: (r) => r.productGroup === '펙수클루' || r.productGroup === '펙수프라잔',
      },
      {
        name: '중국 뉴란타',
        filter: (r) => r.category?.includes('중국') && r.productGroup === '뉴란타',
      },
      {
        name: '태국 에포시스',
        filter: (r) => r.category?.includes('태국') && r.productGroup === '에포시스',
      },
      {
        name: '필리핀 우루사',
        filter: (r) => r.category?.includes('필리핀') && r.productGroup === '우루사',
      },
      {
        name: '베트남 트리마포트',
        filter: (r) => r.category?.includes('베트남') && r.productGroup === '트리마포트',
      },
    ],
    resolve: (rows) => rows,
  },

  수탁: {
    field: 'split',
    splitField: 'category',
    groups: {
      외부수탁: { topN: 3 },
      관계사수탁: { topN: 3, pinnedTop: '펙수프라잔군', pinnedField: 'productGroup' },
    },
    excludeCategories: ['수탁(기타)'],
    resolve: (rows) => rows,
  },
}

/**
 * scData에서 주요품목 데이터 집계
 * @returns 각 품목별 기간별 매출/원가 데이터
 */
export function resolveKeyProducts(scData, division, year, quarter, config) {
  if (!config || !scData) return []
  const months = getMonths(quarter)

  // 해당 기간의 raw 데이터 필터
  const filtered = scData.filter(
    (r) => r.division === division && r.year === year && months.includes(r.month),
  )

  if (config.field === 'custom') {
    return config.customItems.map((item) => {
      const matching = filtered.filter(item.filter)
      const sales = wonToEok(matching.reduce((s, r) => s + (r.sales || 0), 0))
      const cost = wonToEok(matching.reduce((s, r) => s + (r.cost || 0), 0))
      return { name: item.name, sales, cost, costRate: sales > 0 ? cost / sales : null }
    })
  }

  if (config.field === 'split') {
    const result = []
    for (const [cat, groupConfig] of Object.entries(config.groups)) {
      const catFiltered = filtered.filter((r) => r.category === cat)
      const groups = {}
      for (const r of catFiltered) {
        const key = r.productGroup ?? '(미분류)'
        if (!groups[key]) groups[key] = { sales: 0, cost: 0 }
        groups[key].sales += r.sales || 0
        groups[key].cost += r.cost || 0
      }

      let items = Object.entries(groups)
        .map(([name, { sales, cost }]) => ({
          name,
          sales: wonToEok(sales),
          cost: wonToEok(cost),
          costRate: sales > 0 ? cost / sales : null,
          group: cat,
        }))
        .sort((a, b) => b.sales - a.sales)

      // 고정 상위 품목 처리
      if (groupConfig.pinnedTop) {
        const pinned = items.find((i) => i.name === groupConfig.pinnedTop)
        const rest = items.filter((i) => i.name !== groupConfig.pinnedTop)
        items = pinned
          ? [pinned, ...rest.slice(0, groupConfig.topN - 1)]
          : rest.slice(0, groupConfig.topN)
      } else {
        items = items.slice(0, groupConfig.topN)
      }

      result.push(...items)
    }
    return result
  }

  // topN or fixed items
  let groupField = config.field

  // 카테고리 필터
  let base = filtered
  if (config.filterCategory) {
    base = base.filter((r) => r.category === config.filterCategory)
  }

  // 그룹별 집계
  const groups = {}
  for (const r of base) {
    let key = r[groupField] ?? '(미분류)'

    // merge 처리 (CH 우루사)
    if (config.mergeRules) {
      for (const [mergedName, sources] of Object.entries(config.mergeRules)) {
        if (sources.includes(key)) {
          key = mergedName
          break
        }
      }
    }

    if (!groups[key]) groups[key] = { sales: 0, cost: 0 }
    groups[key].sales += r.sales || 0
    groups[key].cost += r.cost || 0
  }

  let items = Object.entries(groups)
    .map(([name, { sales, cost }]) => ({
      name,
      sales: wonToEok(sales),
      cost: wonToEok(cost),
      costRate: sales > 0 ? cost / sales : null,
    }))
    .filter((r) => Math.abs(r.sales) > 0.001)
    .sort((a, b) => b.sales - a.sales)

  // fixed items or resolve
  if (config.fixedItems) {
    items = config.fixedItems
      .map((name) => items.find((r) => r.name === name))
      .filter(Boolean)
  }

  return config.resolve(items)
}
