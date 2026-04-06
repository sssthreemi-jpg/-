import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { DIVISIONS, DIVISION_COLORS } from '../../utils/constants'
import { fmtBillion } from '../../utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-lg rounded-lg border border-border px-3 py-2">
      <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs text-gray-600">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {fmtBillion(entry.value)}억
        </p>
      ))}
    </div>
  )
}

export default function DivisionBarChart({ curAgg, prevAgg, metric, title }) {
  const navigate = useNavigate()

  const chartData = useMemo(() =>
    DIVISIONS.map((div) => ({
      name: div,
      당기: curAgg?.[div]?.[metric] ?? 0,
      전년동기: prevAgg?.[div]?.[metric] ?? 0,
    })),
    [curAgg, prevAgg, metric],
  )

  const handleClick = (_data, index) => {
    const div = chartData[index]?.name
    if (div) navigate('/division')
  }

  const yTickFormatter = (v) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + '천'
    return v.toFixed(0)
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="h-56 lg:h-80"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#666' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={yTickFormatter}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="전년동기"
            fill="#E8E8E8"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
          <Bar
            dataKey="당기"
            radius={[4, 4, 0, 0]}
            barSize={24}
            cursor="pointer"
            onClick={handleClick}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={DIVISION_COLORS[entry.name] || '#999'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer></div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        차트를 클릭하면 사업부 상세로 이동합니다
      </p>
    </div>
  )
}
