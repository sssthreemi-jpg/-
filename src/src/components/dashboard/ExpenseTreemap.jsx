import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { fmtDashboard } from './dashboardFormat'

const EXPENSE_ITEMS = [
  { key: '영업판관비', label: '영업판관비', color: '#FF7043' },
  { key: '판매대행수수료', label: '판대수수료', color: '#FFA726' },
  { key: '매출변동비', label: '매출변동비', color: '#FFCA28' },
  { key: '영업관리비', label: '영업관리비', color: '#66BB6A' },
  { key: '일반관리비', label: '일반관리비', color: '#42A5F5' },
  { key: '비효율비경상비용', label: '기타비용', color: '#AB47BC' },
  { key: 'R&D비용', label: 'R&D', color: '#26A69A' },
]

function TreemapContent({ x, y, width, height, name, value, pct, delta, color }) {
  if (width < 30 || height < 30) return null
  const showDetail = width > 60 && height > 50
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ transition: 'transform 0.15s ease, opacity 0.15s ease', transformOrigin: `${x + width/2}px ${y + height/2}px` }}
        className="hover:opacity-90"
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - (showDetail ? 12 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={width > 80 ? 12 : 10}
        fill="#fff"
        fontWeight={600}
      >
        {name}
      </text>
      {showDetail && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="rgba(255,255,255,0.9)"
          >
            {fmtDashboard(value)}억
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.75)"
          >
            {pct}% {delta != null && (delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`)}
          </text>
        </>
      )}
    </g>
  )
}

function TreemapTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div
      className="bg-white rounded-lg border border-border px-3 py-2.5 text-xs shadow-lg"
      style={{ borderLeft: `3px solid ${d.color || '#F5A623'}` }}
    >
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-gray-600">금액: <span className="font-medium">{fmtDashboard(d.value)}억</span></p>
      <p className="text-gray-600">비중: <span className="font-medium">{d.pct}%</span></p>
      {d.delta != null && (
        <p className={d.delta >= 0 ? 'text-decrease' : 'text-increase'}>
          YoY: {d.delta >= 0 ? '+' : ''}{d.delta.toFixed(1)}%
        </p>
      )}
    </div>
  )
}

export default function ExpenseTreemap({ curAgg, prevAgg }) {
  const navigate = useNavigate()

  const treemapData = useMemo(() => {
    const c = curAgg?.['전사'] || {}
    const p = prevAgg?.['전사'] || {}
    const items = EXPENSE_ITEMS.map((item) => ({
      ...item,
      name: item.label,
      value: Math.abs(c[item.key] || 0),
      prevValue: Math.abs(p[item.key] || 0),
    })).filter((d) => d.value > 0)

    const total = items.reduce((s, d) => s + d.value, 0)

    return items.map((d) => ({
      ...d,
      pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
      delta: d.prevValue > 0 ? ((d.value - d.prevValue) / d.prevValue) * 100 : null,
    }))
  }, [curAgg, prevAgg])

  const handleClick = () => navigate('/expense')

  return (
    <div className="bg-white border border-border rounded-2xl p-4 lg:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">비용 구성</h3>
        <button onClick={handleClick} className="text-xs text-primary font-medium hover:underline">상세 보기 →</button>
      </div>
      <div className="h-48 lg:h-56 cursor-pointer" onClick={handleClick}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="value"
            aspectRatio={4 / 1}
            content={<TreemapContent />}
            animationDuration={600}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
