import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts'
import { fmtBillion, fmtRatio } from '../../utils/formatters'

export default function DivisionChart({ division, periodCols }) {
  const chartData = periodCols.map((col) => {
    const sales = col.agg?.[division]?.['매출'] ?? 0
    const cost = col.agg?.[division]?.['매출원가'] ?? 0
    const opProfit = col.agg?.[division]?.['영업이익'] ?? 0
    return {
      period: col.label,
      매출: Math.round(sales),
      원가율: sales > 0 ? +((cost / sales) * 100).toFixed(1) : 0,
      영업이익률: sales > 0 ? +((opProfit / sales) * 100).toFixed(1) : 0,
    }
  })

  return (
    <div className="card-section p-4 lg:p-5 mb-4">
      <h3 className="text-sm lg:text-base font-semibold text-gray-800 mb-3">{division} 사업부 손익</h3>
      <div className="h-56 md:h-64 lg:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              width={55}
              tickFormatter={(v) => v.toLocaleString()}
              label={{ value: '억원', position: 'insideTopLeft', offset: -5, fontSize: 10, fill: '#999' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={45}
              tickFormatter={(v) => `${v}%`}
              label={{ value: '%', position: 'insideTopRight', offset: -5, fontSize: 10, fill: '#999' }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value, name) => {
                if (name === '매출') return [`${fmtBillion(value)} 억원`, name]
                return [`${value}%`, name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="매출"
              fill="#F5A623"
              radius={[3, 3, 0, 0]}
              barSize={36}
            >
              <LabelList dataKey="매출" position="top" fontSize={11} fill="#F5A623" fontWeight={600} formatter={(v) => v?.toLocaleString('ko-KR')} />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="원가율"
              stroke="#D32F2F"
              strokeWidth={2}
              dot={{ r: 4 }}
            >
              <LabelList dataKey="원가율" position="top" fontSize={11} fill="#D32F2F" fontWeight={600} formatter={(v) => `${v}%`} />
            </Line>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="영업이익률"
              stroke="#1565C0"
              strokeWidth={2}
              dot={{ r: 4 }}
            >
              <LabelList dataKey="영업이익률" position="bottom" fontSize={11} fill="#1565C0" fontWeight={600} formatter={(v) => `${v}%`} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
