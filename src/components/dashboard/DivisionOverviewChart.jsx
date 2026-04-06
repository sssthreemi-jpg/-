import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Scatter, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ZAxis,
} from 'recharts'
import { DIVISIONS, DIVISION_COLORS } from '../../utils/constants'
import { fmtDashboard } from './dashboardFormat'

function OverviewTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const salesDelta = d.당기매출 - d.전년동기매출
  return (
    <div className="bg-white shadow-lg rounded-lg border border-border px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold mb-1.5" style={{ color: DIVISION_COLORS[d.name] || '#333' }}>
        {d.name}
      </p>
      <div className="space-y-1 text-gray-600">
        <p>당기 매출: <span className="font-medium text-gray-800">{fmtDashboard(d.당기매출)}억</span></p>
        <p>전년동기 매출: <span className="font-medium">{fmtDashboard(d.전년동기매출)}억</span></p>
        <p className={salesDelta >= 0 ? 'text-increase' : 'text-decrease'}>
          증감: {salesDelta >= 0 ? '+' : ''}{fmtDashboard(salesDelta)}억
        </p>
        <hr className="border-gray-100 my-1" />
        <p>
          원가율: <span className="font-medium text-decrease">{d.원가율_당기}%</span>
          <span className="text-gray-400 ml-1">(전년 {d.원가율_전년}%)</span>
        </p>
        <p>
          영업이익률: <span className="font-medium text-increase">{d.영업이익률_당기}%</span>
          <span className="text-gray-400 ml-1">(전년 {d.영업이익률_전년}%)</span>
        </p>
      </div>
    </div>
  )
}

const DiamondShape = (props) => {
  const { cx, cy } = props
  if (cx == null || cy == null) return null
  const s = 6
  return (
    <polygon
      points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
      fill="#D32F2F"
      stroke="#fff"
      strokeWidth={1.5}
    />
  )
}

const CircleShape = (props) => {
  const { cx, cy } = props
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={5} fill="#1565C0" stroke="#fff" strokeWidth={1.5} />
}

export default function DivisionOverviewChart({ curAgg, prevAgg }) {
  const navigate = useNavigate()

  const chartData = useMemo(() =>
    DIVISIONS.map((div) => {
      const curSales = curAgg?.[div]?.['매출'] ?? 0
      const prevSales = prevAgg?.[div]?.['매출'] ?? 0
      const curCost = curAgg?.[div]?.['매출원가'] ?? 0
      const prevCost = prevAgg?.[div]?.['매출원가'] ?? 0
      const curOp = curAgg?.[div]?.['영업이익'] ?? 0
      const prevOp = prevAgg?.[div]?.['영업이익'] ?? 0
      return {
        name: div,
        당기매출: Math.round(curSales * 10) / 10,
        전년동기매출: Math.round(prevSales * 10) / 10,
        원가율_당기: curSales > 0 ? +((curCost / curSales) * 100).toFixed(1) : 0,
        원가율_전년: prevSales > 0 ? +((prevCost / prevSales) * 100).toFixed(1) : 0,
        영업이익률_당기: curSales > 0 ? +((curOp / curSales) * 100).toFixed(1) : 0,
        영업이익률_전년: prevSales > 0 ? +((prevOp / prevSales) * 100).toFixed(1) : 0,
      }
    }),
    [curAgg, prevAgg],
  )

  const handleBarClick = (_d, index) => {
    const div = chartData[index]?.name
    if (div) navigate(`/division?division=${encodeURIComponent(div)}`)
  }

  const yTickFormatter = (v) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + '천'
    return v.toFixed(0)
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">사업부별 매출 & 수익성</h3>
      <div className="h-64 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#555' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={yTickFormatter}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
            />
            <ZAxis range={[100, 100]} />
            <Tooltip content={<OverviewTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              payload={[
                { value: '전년동기 매출', type: 'rect', color: '#E0E0E0' },
                { value: '당기 매출', type: 'rect', color: '#F5A623' },
                { value: '원가율', type: 'diamond', color: '#D32F2F' },
                { value: '영업이익률', type: 'circle', color: '#1565C0' },
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="전년동기매출"
              fill="#E0E0E0"
              radius={[3, 3, 0, 0]}
              barSize={20}
              name="전년동기 매출"
            />
            <Bar
              yAxisId="left"
              dataKey="당기매출"
              radius={[3, 3, 0, 0]}
              barSize={20}
              name="당기 매출"
              cursor="pointer"
              onClick={handleBarClick}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={DIVISION_COLORS[entry.name] || '#999'} />
              ))}
            </Bar>
            <Scatter
              yAxisId="right"
              dataKey="원가율_당기"
              name="원가율"
              shape={<DiamondShape />}
              legendType="diamond"
            />
            <Scatter
              yAxisId="right"
              dataKey="영업이익률_당기"
              name="영업이익률"
              shape={<CircleShape />}
              legendType="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        막대를 클릭하면 사업부 상세로 이동합니다
      </p>
    </div>
  )
}
