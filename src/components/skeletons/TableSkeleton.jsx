export default function TableSkeleton({ rows = 8 }) {
  return (
    <div className="card-section rounded-2xl overflow-hidden animate-fade-in">
      {/* 헤더 */}
      <div className="h-10 bg-gradient-to-r from-primary to-primary-dark" />
      {/* 행 */}
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="skeleton h-4 w-24 flex-shrink-0" />
            <div className="skeleton h-4 flex-1 max-w-20" />
            <div className="skeleton h-4 flex-1 max-w-16 hidden md:block" />
            <div className="skeleton h-4 flex-1 max-w-16 hidden md:block" />
            <div className="skeleton h-4 flex-1 max-w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
