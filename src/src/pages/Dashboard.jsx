import { useMemo } from 'react'
import { usePeriod } from '../contexts/PeriodContext'
import { aggregate, buildTrendData } from '../utils/periodHelpers'
import EnhancedKpiCards from '../components/dashboard/EnhancedKpiCards'
import PLWaterfallChart from '../components/dashboard/PLWaterfallChart'
import QuarterlyTrendChart from '../components/dashboard/QuarterlyTrendChart'
import ExpenseTreemap from '../components/dashboard/ExpenseTreemap'
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'
import { ErrorState, NoDataState } from '../components/EmptyState'

export default function Dashboard() {
  const { data, loading, error, year, quarter } = usePeriod()

  const curAgg = useMemo(
    () => data?.data ? aggregate(data.data, year, quarter) : null,
    [data, year, quarter],
  )
  const prevAgg = useMemo(
    () => data?.data ? aggregate(data.data, year - 1, quarter) : null,
    [data, year, quarter],
  )

  const trendData = useMemo(
    () => data?.data && quarter > 0
      ? buildTrendData(data.data, year, quarter, 8)
      : null,
    [data, year, quarter],
  )

  const sparkTrend = useMemo(
    () => data?.data && quarter > 0
      ? buildTrendData(data.data, year, quarter, 5)
      : null,
    [data, year, quarter],
  )

  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorState onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-5 lg:space-y-6">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900">손익 대시보드</h2>
      <EnhancedKpiCards curAgg={curAgg} prevAgg={prevAgg} trendData={sparkTrend} />
      <PLWaterfallChart curAgg={curAgg} prevAgg={prevAgg} />
      <QuarterlyTrendChart trendData={trendData} />
      <ExpenseTreemap curAgg={curAgg} prevAgg={prevAgg} />
    </div>
  )
}
