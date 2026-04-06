import { fmtBillion, fmtRatio, fmtDelta, fmtDeltaPp, deltaClass } from '../../utils/formatters'

const cards = [
  {
    label: '매출',
    getValue: (agg) => agg?.['매출'],
    format: (v) => fmtBillion(v),
    unit: '억',
    getDelta: (cur, prev) => (cur?.['매출'] ?? 0) - (prev?.['매출'] ?? 0),
    formatDelta: fmtDelta,
    invertColor: false,
  },
  {
    label: '매출원가율',
    getValue: (agg) => agg?.['매출'] ? agg['매출원가'] / agg['매출'] : null,
    format: (v) => fmtRatio(v),
    unit: null,
    getDelta: (cur, prev) => {
      const curRate = cur?.['매출'] ? cur['매출원가'] / cur['매출'] : 0
      const prevRate = prev?.['매출'] ? prev['매출원가'] / prev['매출'] : 0
      return curRate - prevRate
    },
    formatDelta: fmtDeltaPp,
    invertColor: true, // 원가율 증가 = 부정적
  },
  {
    label: 'R&D',
    getValue: (agg) => agg?.['R&D비용'],
    format: (v) => fmtBillion(v),
    unit: '억',
    getDelta: (cur, prev) => (cur?.['R&D비용'] ?? 0) - (prev?.['R&D비용'] ?? 0),
    formatDelta: fmtDelta,
    invertColor: false,
  },
  {
    label: '영업이익',
    getValue: (agg) => agg?.['영업이익'],
    format: (v) => fmtBillion(v),
    unit: '억',
    getDelta: (cur, prev) => (cur?.['영업이익'] ?? 0) - (prev?.['영업이익'] ?? 0),
    formatDelta: fmtDelta,
    invertColor: false,
    // 영업이익률 추가 표시
    getMargin: (agg) => agg?.['매출'] ? agg['영업이익'] / agg['매출'] : null,
  },
]

export default function CompanyKpiCards({ curAgg, prevAgg }) {
  const cur = curAgg?.['전사']
  const prev = prevAgg?.['전사']

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const value = card.getValue(cur)
        const delta = card.getDelta(cur, prev)
        const colorClass = card.invertColor ? deltaClass(-delta) : deltaClass(delta)

        return (
          <div
            key={card.label}
            className="bg-white border border-border rounded-2xl p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs lg:text-sm font-medium text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900">
              {card.format(value)}
              {card.unit && <span className="text-sm font-normal text-gray-400 ml-0.5">{card.unit}</span>}
            </p>
            {card.getMargin && (
              <p className="text-sm text-gray-500 mt-0.5">
                마진 {fmtRatio(card.getMargin(cur))}
              </p>
            )}
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-sm font-medium ${colorClass}`}>
                {card.formatDelta(delta)}{card.unit ? '억' : ''}
              </span>
              <span className="text-[10px] text-gray-400">전년동기比</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
