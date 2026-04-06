const quarters = [
  { value: 1, label: '1Q' },
  { value: 2, label: '2Q' },
  { value: 3, label: '3Q' },
  { value: 4, label: '4Q' },
  { value: 0, label: '연간' },
]

export default function PeriodSelector({ year, quarter, years, onYearChange, onQuarterChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="border border-border rounded-lg px-2 py-1.5 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>

      <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1">
        {quarters.map((q) => (
          <button
            key={q.value}
            onClick={() => onQuarterChange(q.value)}
            className={`px-2.5 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${
              quarter === q.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}
