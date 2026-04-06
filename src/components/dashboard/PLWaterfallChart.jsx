import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { fmtDashboard } from './dashboardFormat'

const COLORS = {
  total: '#F5A623',
  subtotal: '#1565C0',
  deduction: '#EF5350',
  prev: '#E0E0E0',
}

const STEPS = [
  { key: '매출', label: '매출', type: 'total', nav: '/division' },
  { key: '매출원가', label: '매출원가', type: 'deduction', nav: '/cost' },
  { key: '매출총이익', label: '매출총이익', type: 'subtotal' },
  { key: '영업판관비', label: '영업판관비', type: 'deduction', nav: '/expense' },
  { key: '판매대행수수료', label: '판대수수료', type: 'deduction', nav: '/expense' },
  { key: '매출변동비', label: '매출변동비', type: 'deduction', nav: '/expense' },
  { key: '영업관리비', label: '영업관리비', type: 'deduction', nav: '/expense' },
  { key: '일반관리비', label: '일반관리비', type: 'deduction', nav: '/expense' },
  { key: '비효율비경상비용', label: '기타비용', type: 'deduction', nav: '/expense' },
  { key: 'R&D비용', label: 'R&D', type: 'deduction', nav: '/expense' },
  { key: '영업이익', label: '영업이익', type: 'subtotal' },
]

function buildWaterfallData(curAgg, prevAgg) {
  const c = curAgg?.['전사'] || {}
  const p = prevAgg?.['전사'] || {}

  let running = c['매출'] || 0
  let prevRunning = p['매출'] || 0

  return STEPS.map((step) => {
    const value = c[step.key] || 0
    const prevValue = p[step.key] || 0

    if (step.type === 'total') {
      return { ...step, invisible: 0, bar: value, prevInvisible: 0, prevBar: prevValue }
    }
    if (step.type === 'deduction') {
      running -= value
      prevRunning -= prevValue
      return {
        ...step,
        invisible: running,
        bar: value,
        prevInvisible: prevRunning,
        prevBar: prevValue,
      }
    }
    // subtotal - reset running to the subtotal value for subsequent deductions
    running = value
    prevRunning = prevValue
    return { ...step, invisible: 0, bar: value, prevInvisible: 0, prevBar: prevValue }
  })
}

function WaterfallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const delta = d.bar - d.prevBar
  const pct = d.prevBar ? ((delta / d.prevBar) * 100).toFixed(1) : '-'
  const barColor = COLORS[d.type] || COLORS.total
  return (
    <div
      className="bg-white rounded-lg border border-border px-3 py-2.5 text-xs shadow-lg"
      style={{ borderLeft: `3px solid ${barColor}` }}
    >
      <p className="font-semibold text-gray-800 mb-1">{d.label}</p>
      <p className="text-gray-600">당기: <span className="font-medium">{fmtDashboard(d.bar)}억</span></p>
      <p className="text-gray-600">전년동기: <span className="font-medium">{fmtDashboard(d.prevBar)}억</span></p>
      <p className={delta >= 0 ? 'text-increase' : 'text-decrease'}>
        증감: {delta >= 0 ? '+' : ''}{fmtDashboard(delta)}억 ({pct}%)
      </p>
    </div>
  )
}

/** LabelList의 커스텀 렌더러 - 각 바의 고유 금액을 표시 */
function renderBarLabel(props) {
  // Recharts LabelList는 content 함수에 다양한 props를 전달
  // stacked bar에서 value는 누적값일 수 있으므로, 원본 데이터에서 직접 읽음
  const { x, y, width, height, value, index, offset } = props
  // value는 LabelList의 dataKey="bar"에서 옴 → 항목 고유 금액
  if (value == null || value === 0) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={12}
      fill="#555"
      fontWeight={600}
    >
      {fmtDashboard(value)}억
    </text>
  )
}

export default function PLWaterfallChart({ curAgg, prevAgg }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()

  const data = useMemo(() => buildWaterfallData(curAgg, prevAgg), [curAgg, prevAgg])

  const handleClick = useCallback((_d, index) => {
    const step = data[index]
    if (step?.nav) navigate(step.nav)
  }, [data, navigate])

  const yTickFormatter = (v) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + '천'
    return v.toFixed(0)
  }

  const maxVal = Math.max(...data.map((d) => d.invisible + d.bar), 0) * 1.12

  if (isMobile) {
    return (
      <div className="card-section rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">손익 흐름 <span className="text-xs font-normal text-gray-400 ml-1">항목을 탭하면 상세로 이동</span></h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: '#555' }}
                axisLine={false}
                tickLine={false}
                width={65}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yTickFormatter}
                domain={[0, maxVal]}
              />
              <Tooltip content={<WaterfallTooltip />} />
              <Bar dataKey="invisible" stackId="cur" fill="transparent" isAnimationActive={false} />
              <Bar
                dataKey="bar"
                stackId="cur"
                radius={[0, 4, 4, 0]}
                barSize={24}
                cursor="pointer"
                onClick={handleClick}
                animationDuration={800}
                animationEasing="ease-out"
                animationBegin={100}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="card-section rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">손익 흐름 <span className="text-xs font-normal text-gray-400 ml-1">항목을 클릭하면 상세로 이동</span></h3>
      <div className="h-80 lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#555' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              width={55}
              tickFormatter={yTickFormatter}
              domain={[0, maxVal]}
            />
            <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="invisible" stackId="cur" fill="transparent" isAnimationActive={false} />
            <Bar
              dataKey="bar"
              stackId="cur"
              radius={[4, 4, 0, 0]}
              barSize={40}
              cursor="pointer"
              onClick={handleClick}
              animationDuration={1000}
              animationEasing="ease-out"
              animationBegin={200}
            >
              <LabelList dataKey="bar" content={renderBarLabel} />
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.type]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLORS.total }} />매출
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLORS.deduction }} />차감 항목
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLORS.subtotal }} />소계/합계
        </span>
      </div>
    </div>
  )
}
