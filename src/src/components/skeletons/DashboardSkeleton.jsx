export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="skeleton h-8 w-48" />
      {/* KPI 카드 스켈레톤 */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="kpi-card rounded-2xl">
            <div className="skeleton h-3 w-12 mb-3" />
            <div className="skeleton h-8 w-24 mb-2" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      {/* 차트 스켈레톤 */}
      <div className="card-section rounded-2xl p-5">
        <div className="skeleton h-4 w-40 mb-4" />
        <div className="skeleton h-64 lg:h-80 w-full rounded-xl" />
      </div>
      {/* 추이 차트 스켈레톤 */}
      <div className="card-section rounded-2xl p-5">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-56 lg:h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
