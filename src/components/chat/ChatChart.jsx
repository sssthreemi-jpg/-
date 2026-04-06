/**
 * 챗봇 메시지 내 차트 렌더링 — Recharts 기반
 * memo로 감싸서 차트 리렌더 방지 (rerender-memo)
 */
import { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// 차트 색상 팔레트
const COLORS = ['#F5A623', '#1565C0', '#4CAF50', '#D32F2F', '#9C27B0', '#FF5722', '#607D8B', '#795548'];

export default memo(function ChatChart({ chartData }) {
  if (!chartData || !chartData.data || chartData.data.length === 0) return null;

  const { chart_type, title, data, x_key, y_keys, y_label } = chartData;

  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  };

  const renderTooltip = (
    <Tooltip contentStyle={{ fontSize: 11 }} />
  );

  const renderGrid = <CartesianGrid strokeDasharray="3 3" stroke="#eee" />;
  const renderXAxis = <XAxis dataKey={x_key} tick={{ fontSize: 10 }} />;
  const renderYAxis = <YAxis tick={{ fontSize: 10 }} width={50} />;
  const renderLegend = <Legend wrapperStyle={{ fontSize: 11 }} />;

  let chart;

  switch (chart_type) {
    case 'line':
      chart = (
        <LineChart {...commonProps}>
          {renderGrid}
          {renderXAxis}
          {renderYAxis}
          {renderTooltip}
          {renderLegend}
          {y_keys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      );
      break;

    case 'bar':
      chart = (
        <BarChart {...commonProps}>
          {renderGrid}
          {renderXAxis}
          {renderYAxis}
          {renderTooltip}
          {renderLegend}
          {y_keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      );
      break;

    case 'stacked_bar':
      chart = (
        <BarChart {...commonProps}>
          {renderGrid}
          {renderXAxis}
          {renderYAxis}
          {renderTooltip}
          {renderLegend}
          {y_keys.map((key, i) => (
            <Bar key={key} dataKey={key} stackId="stack" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      );
      break;

    case 'pie':
      chart = (
        <PieChart>
          {renderTooltip}
          <Pie
            data={data}
            dataKey={y_keys[0] || 'value'}
            nameKey={x_key || 'name'}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          {renderLegend}
        </PieChart>
      );
      break;

    case 'composed':
      chart = (
        <ComposedChart {...commonProps}>
          {renderGrid}
          {renderXAxis}
          {renderYAxis}
          {renderTooltip}
          {renderLegend}
          {y_keys.map((key, i) =>
            i === 0 ? (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ) : (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ),
          )}
        </ComposedChart>
      );
      break;

    default:
      return <p className="text-xs text-gray-500">지원하지 않는 차트 유형: {chart_type}</p>;
  }

  return (
    <div className="my-2 bg-white rounded-lg border border-border p-3">
      {title && <p className="text-xs font-semibold text-gray-800 mb-2">{title}</p>}
      {y_label && <p className="text-[10px] text-gray-500 mb-1">단위: {y_label}</p>}
      <div className="min-h-[180px] max-h-[280px]" style={{ height: 'clamp(180px, 40vw, 280px)' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  );
})
