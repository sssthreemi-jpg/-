import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'
import { useData } from '../hooks/useData'
import { DIVISIONS, DIVISION_COLORS } from '../utils/constants'
import { fmtBillion, fmtPercent } from '../utils/formatters'
import ProductDetail from '../components/ProductDetail'

/* ── 사업부별 드릴다운 계층 정의 ── */
const DRILL_CONFIG = {
  ETC: [
    { field: 'productType', label: '제상' },
    { field: 'category', label: '중분류' },
    { field: 'profitTier', label: '수익군' },
    { field: 'productGroup', label: '품목구분' },
  ],
  CH: [
    { field: 'category', label: '중분류' },
    { field: 'productGroup', label: '품목구분' },
  ],
  건기식: [
    { field: 'category', label: '중분류' },
    { field: 'productGroup', label: '품목구분' },
  ],
  나보타: [
    { field: 'category', label: '국내/수출' },
    { field: 'productGroup', label: '품목구분' },
  ],
  글로벌: [
    { field: 'category', label: '국가/채널' },
    { field: 'productGroup', label: '품목구분' },
  ],
  수탁: [
    { field: 'category', label: '수탁구분' },
    { field: 'productGroup', label: '품목구분' },
  ],
}

const PL_SUMMARY_KEYS = [
  { key: '매출', label: '매출' },
  { key: '매출원가', label: '매출원가' },
  { key: '매출총이익', label: '매출총이익', highlight: true },
  { key: '영업판관비', label: '영업판관비' },
  { key: '판매대행수수료', label: '판매대행수수료' },
  { key: '매출변동비', label: '매출변동비' },
  { key: '영업관리비', label: '영업관리비' },
  { key: '일반관리비', label: '일반관리비' },
  { key: '비효율비경상비용', label: '기타비용' },
  { key: 'R&D차감전이익', label: 'R&D차감전이익', highlight: true },
  { key: 'R&D비용', label: 'R&D비용' },
  { key: '영업이익', label: '영업이익', highlight: true },
]

export default function SalesCostAnalysis() {
  const { division: paramDiv } = useParams()
  const navigate = useNavigate()
  const initDiv = paramDiv ? decodeURIComponent(paramDiv) : DIVISIONS[0]

  const [division, setDivision] = useState(initDiv)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [quarter, setQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3))
  const [drillPath, setDrillPath] = useState([])   // [{field, value}, ...]
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showTarget, setShowTarget] = useState(false)

  const { data: plData, loading: plLoading } = useData('/data/pl_monthly.json')
  const { data: scData, loading: scLoading } = useData('/data/sales_cost_summary.json')

  const loading = plLoading || scLoading
  const months = quarter === 0
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [quarter * 3 - 2, quarter * 3 - 1, quarter * 3]

  // ── 손익 요약 (pl_monthly) ──
  const { plCurrent, plPrevious, plTarget, hasTarget } = useMemo(() => {
    if (!plData) return { plCurrent: null, plPrevious: null, plTarget: null, hasTarget: false }
    function agg(yr, type = '실적') {
      const entries = plData.data.filter(
        (e) => e.type === type && e.year === yr && months.includes(e.month),
      )
      if (!entries.length) return null
      const result = {}
      PL_SUMMARY_KEYS.forEach(({ key }) => {
        result[key] = entries.reduce((s, e) => s + (e.items?.[division]?.[key] ?? 0), 0)
      })
      result['매출원가율'] = result['매출'] ? result['매출원가'] / result['매출'] : null
      return result
    }
    const tgt = agg(year, '목표')
    return { plCurrent: agg(year), plPrevious: agg(year - 1), plTarget: tgt, hasTarget: tgt != null }
  }, [plData, division, year, months])

  // ── 매출/원가 품목 데이터 (sales_cost_summary) ──
  const { rows, drillLevel, levelConfig } = useMemo(() => {
    if (!scData) return { rows: [], drillLevel: 0, levelConfig: null }

    const config = DRILL_CONFIG[division] || DRILL_CONFIG['ETC']

    function aggregate(yr) {
      let filtered = scData.data.filter(
        (r) => r.year === yr && months.includes(r.month) && r.division === division,
      )
      // drillPath 필터 적용
      drillPath.forEach(({ field, value }) => {
        filtered = filtered.filter((r) => r[field] === value)
      })

      // 현재 드릴 레벨의 필드로 그룹핑
      const level = drillPath.length
      if (level >= config.length) {
        // 최하위 — productName 레벨
        const groups = {}
        filtered.forEach((r) => {
          const key = r.productName || r.productGroup || '기타'
          if (!groups[key]) groups[key] = { sales: 0, cost: 0, count: 0 }
          groups[key].sales += r.sales || 0
          groups[key].cost += r.cost || 0
          groups[key].count++
        })
        return groups
      }

      const groupField = config[level].field
      const groups = {}
      filtered.forEach((r) => {
        const key = r[groupField] ?? '(미분류)'
        if (!groups[key]) groups[key] = { sales: 0, cost: 0, count: 0 }
        groups[key].sales += r.sales || 0
        groups[key].cost += r.cost || 0
        groups[key].count++
      })
      return groups
    }

    const curGroups = aggregate(year)
    const prevGroups = aggregate(year - 1)

    const level = drillPath.length
    const curConfig = level < config.length ? config[level] : { field: 'leaf', label: '품목' }

    const rows = Object.entries(curGroups)
      .map(([name, { sales, cost }]) => {
        const prev = prevGroups[name]
        const salesEok = sales / 1e8
        const costEok = cost / 1e8
        const costRate = sales ? cost / sales : null
        const prevSalesEok = prev ? prev.sales / 1e8 : null
        const prevCostEok = prev ? prev.cost / 1e8 : null
        const prevCostRate = prev && prev.sales ? prev.cost / prev.sales : null
        return {
          name,
          sales: salesEok,
          cost: costEok,
          grossProfit: salesEok - costEok,
          costRate,
          prevSales: prevSalesEok,
          prevCost: prevCostEok,
          prevCostRate,
          salesDiff: prevSalesEok != null ? salesEok - prevSalesEok : null,
          canDrill: level < config.length,
        }
      })
      .filter((r) => Math.abs(r.sales) > 0.001 || Math.abs(r.cost) > 0.001)
      .sort((a, b) => Math.abs(b.sales) - Math.abs(a.sales))

    return { rows, drillLevel: level, levelConfig: curConfig }
  }, [scData, division, year, months, drillPath])

  // ── 핸들러 ──
  function handleDrill(name) {
    const config = DRILL_CONFIG[division] || DRILL_CONFIG['ETC']
    if (drillPath.length >= config.length) {
      // 최하위 레벨 — 품목 상세 열기
      setSelectedProduct(name)
      return
    }
    const field = config[drillPath.length].field
    setDrillPath([...drillPath, { field, value: name }])
    setSelectedProduct(null)
  }

  function handleBreadcrumb(index) {
    setDrillPath(drillPath.slice(0, index))
    setSelectedProduct(null)
  }

  function switchDivision(div) {
    setDivision(div)
    setDrillPath([])
    setSelectedProduct(null)
    navigate(`/sales-cost/${encodeURIComponent(div)}`, { replace: true })
  }

  if (loading)
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>

  const years = [
    ...new Set(plData.data.filter((e) => e.type === '실적').map((e) => e.year)),
  ].sort()
  const periodLabel = quarter === 0 ? `${year}년 연간` : `${year}년 ${quarter}Q`

  // 매출/원가 합계
  const totalSales = rows.reduce((s, r) => s + r.sales, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)

  return (
    <div>
      {/* ════════ 사업부 탭 ════════ */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scroll-fade">
        {DIVISIONS.map((div) => (
          <button
            key={div}
            onClick={() => switchDivision(div)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              division === div
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={division === div ? { backgroundColor: DIVISION_COLORS[div] } : {}}
          >
            {div}
          </button>
        ))}
      </div>

      {/* ════════ 기간 선택 ════════ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-base md:text-lg font-bold mr-auto">{division} 매출/원가 분석</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          {years.map((y) => (<option key={y} value={y}>{y}년</option>))}
        </select>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          {[
            { v: 1, l: '1Q' }, { v: 2, l: '2Q' },
            { v: 3, l: '3Q' }, { v: 4, l: '4Q' },
            { v: 0, l: '연간' },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setQuarter(v)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                quarter === v
                  ? 'bg-primary text-white font-semibold shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {hasTarget && (
          <button
            onClick={() => setShowTarget((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              showTarget
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-border hover:border-gray-400'
            }`}
          >
            목표 대비
          </button>
        )}
      </div>

      {/* ════════ 손익 요약 카드 ════════ */}
      {plCurrent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          {[
            { label: '매출', key: '매출' },
            { label: '영업이익', key: '영업이익' },
            { label: '매출총이익', key: '매출총이익' },
            { label: '원가율', key: '매출원가율', isRate: true },
          ].map(({ label, key, isRate }) => {
            const cur = plCurrent[key]
            const prev = plPrevious?.[key]
            const diff = cur != null && prev != null ? cur - prev : null
            const good = isRate ? diff < 0 : diff > 0
            return (
              <div key={key} className="bg-surface rounded-xl p-3 border border-border">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-xl font-bold">
                  {isRate ? fmtPercent(cur) : fmtBillion(cur)}
                  {!isRate && <span className="text-xs font-normal text-gray-400 ml-1">억원</span>}
                </p>
                {diff != null && diff !== 0 && (
                  <p className={`text-xs mt-0.5 ${good ? 'text-increase' : 'text-decrease'}`}>
                    {isRate
                      ? `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%p`
                      : `${diff > 0 ? '+' : ''}${fmtBillion(diff)}`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ════════ 손익 요약 테이블 ════════ */}
      {plCurrent && (
        <div className="overflow-x-auto border border-border rounded-xl mb-6">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left font-semibold">항목</th>
                <th className="px-3 py-2 text-right font-semibold">{periodLabel}</th>
                <th className="px-3 py-2 text-right font-semibold">
                  {showTarget && plTarget ? '목표' : '전년동기'}
                </th>
                <th className="px-3 py-2 text-right font-semibold">
                  {showTarget && plTarget ? '달성률' : '증감'}
                </th>
              </tr>
            </thead>
            <tbody>
              {PL_SUMMARY_KEYS.map(({ key, label, highlight }) => {
                const cur = plCurrent[key]
                const compare = showTarget && plTarget ? plTarget[key] : plPrevious?.[key]
                const diff = cur != null && compare != null ? cur - compare : null
                const achRate = showTarget && plTarget && compare != null && compare !== 0
                  ? cur / compare : null
                return (
                  <tr key={key} className={`border-t border-border/60 ${highlight ? 'bg-primary-light font-semibold' : ''}`}>
                    <td className={`px-3 py-1.5 ${highlight ? 'font-semibold' : ''}`}>{label}</td>
                    <td className="px-3 py-1.5 text-right">{fmtBillion(cur)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-500">
                      {compare != null ? fmtBillion(compare) : '-'}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${
                      showTarget && plTarget
                        ? (achRate != null && achRate >= 1 ? 'text-increase' : 'text-decrease')
                        : (diff > 0 ? 'text-increase' : diff < 0 ? 'text-decrease' : '')
                    }`}>
                      {showTarget && plTarget
                        ? (achRate != null ? `${(achRate * 100).toFixed(1)}%` : '-')
                        : (diff != null ? `${diff > 0 ? '+' : ''}${fmtBillion(diff)}` : '-')
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ 매출 증감 워터폴 차트 ════════ */}
      {drillPath.length === 0 && rows.length > 0 && (() => {
        // 전년비 증감 상위/하위 품목으로 워터폴 구성
        const items = rows
          .filter((r) => r.salesDiff != null && Math.abs(r.salesDiff) > 0.1)
          .sort((a, b) => b.salesDiff - a.salesDiff)
        const top5 = items.slice(0, 5)
        const bottom3 = items.slice(-3).reverse()
        const shown = [...top5, ...bottom3.filter((b) => !top5.includes(b))]
        const totalDiff = rows.reduce((s, r) => s + (r.salesDiff ?? 0), 0)

        const wfData = [
          ...shown.map((r) => ({
            name: r.name.length > 6 ? r.name.slice(0, 5) + '…' : r.name,
            fullName: r.name,
            value: Math.round(r.salesDiff * 10) / 10,
          })),
          { name: '합계', fullName: '전체 증감', value: Math.round(totalDiff * 10) / 10, isTotal: true },
        ]

        return (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              매출 증감 요인 ({periodLabel} 전년비, 억원)
            </h3>
            <div className="h-48 md:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wfData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v, _, props) => [
                      `${v > 0 ? '+' : ''}${fmtBillion(v)} 억원`,
                      props.payload.fullName,
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#ccc" />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={28}>
                    {wfData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.isTotal ? '#333' : entry.value >= 0 ? '#1565C0' : '#D32F2F'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* ════════ Breadcrumb ════════ */}
      <nav className="flex items-center gap-1 text-xs md:text-sm mb-3 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="text-gray-400 hover:text-gray-600">전사</Link>
        <span className="text-gray-300">&gt;</span>
        <button
          onClick={() => handleBreadcrumb(0)}
          className={`hover:text-gray-800 ${drillPath.length === 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
        >
          {division}
        </button>
        {drillPath.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-300">&gt;</span>
            <button
              onClick={() => handleBreadcrumb(i + 1)}
              className={`hover:text-gray-800 ${
                i === drillPath.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-500'
              }`}
            >
              {seg.value}
            </button>
          </span>
        ))}
      </nav>

      {/* ════════ 매출/원가 테이블 ════════ */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-700">
            {levelConfig?.label || '품목'} 별 매출/원가 ({periodLabel}, 단위: 억원)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-3 py-2 text-left font-semibold min-w-[160px]">
                  {levelConfig?.label || '품목'}
                </th>
                <th className="px-3 py-2 text-right font-semibold min-w-[90px]">매출</th>
                <th className="px-3 py-2 text-right font-semibold min-w-[80px]">전년비</th>
                <th className="px-3 py-2 text-right font-semibold min-w-[90px]">원가</th>
                <th className="px-3 py-2 text-right font-semibold min-w-[90px]">매출총이익</th>
                <th className="px-3 py-2 text-right font-semibold min-w-[70px]">원가율</th>
                <th className="px-3 py-2 text-right font-semibold min-w-[70px]">전년</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const costRateDiff =
                  row.costRate != null && row.prevCostRate != null
                    ? row.costRate - row.prevCostRate
                    : null
                return (
                  <tr
                    key={row.name}
                    className={`border-t border-border/60 cursor-pointer hover:bg-primary-light/50 transition-colors ${
                      selectedProduct === row.name ? 'bg-primary-light' : ''
                    }`}
                    onClick={() => {
                      if (row.canDrill) handleDrill(row.name)
                      else setSelectedProduct(selectedProduct === row.name ? null : row.name)
                    }}
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        {row.name}
                        {row.canDrill && (
                          <span className="text-gray-300 text-xs">▸</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{fmtBillion(row.sales)}</td>
                    <td className={`px-3 py-2 text-right text-xs ${
                      row.salesDiff > 0 ? 'text-increase' : row.salesDiff < 0 ? 'text-decrease' : 'text-gray-400'
                    }`}>
                      {row.salesDiff != null
                        ? `${row.salesDiff > 0 ? '+' : ''}${fmtBillion(row.salesDiff)}`
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtBillion(row.cost)}</td>
                    <td className="px-3 py-2 text-right">{fmtBillion(row.grossProfit)}</td>
                    <td className="px-3 py-2 text-right">{fmtPercent(row.costRate)}</td>
                    <td className={`px-3 py-2 text-right text-xs ${
                      costRateDiff != null
                        ? costRateDiff > 0 ? 'text-decrease' : 'text-increase'
                        : ''
                    }`}>
                      {costRateDiff != null
                        ? `${costRateDiff > 0 ? '+' : ''}${(costRateDiff * 100).toFixed(1)}%p`
                        : '-'}
                    </td>
                  </tr>
                )
              })}
              {/* ── 합계 행 ── */}
              <tr className="border-t-2 border-primary bg-gray-50 font-semibold">
                <td className="px-3 py-2">합계</td>
                <td className="px-3 py-2 text-right">{fmtBillion(totalSales)}</td>
                <td className="px-3 py-2 text-right"></td>
                <td className="px-3 py-2 text-right">{fmtBillion(totalCost)}</td>
                <td className="px-3 py-2 text-right">{fmtBillion(totalSales - totalCost)}</td>
                <td className="px-3 py-2 text-right">
                  {totalSales ? fmtPercent(totalCost / totalSales) : '-'}
                </td>
                <td className="px-3 py-2 text-right"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ 품목 상세 패널 ════════ */}
      {selectedProduct && (
        <div className="mt-6">
          <ProductDetail
            productGroup={selectedProduct}
            division={division}
            drillPath={drillPath}
            year={year}
            scData={scData}
            onClose={() => setSelectedProduct(null)}
          />
        </div>
      )}
    </div>
  )
}
