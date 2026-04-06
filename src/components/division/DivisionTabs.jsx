import { DIVISIONS, DIVISION_COLORS } from '../../utils/constants'

export default function DivisionTabs({ division, onSelect }) {
  return (
    <div role="tablist" aria-label="사업부 선택" className="flex gap-1 overflow-x-auto pb-2 mb-3 scroll-fade">
      {DIVISIONS.map((div) => (
        <button
          key={div}
          role="tab"
          aria-selected={division === div}
          onClick={() => onSelect(div)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            division === div
              ? 'text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={division === div ? { backgroundColor: DIVISION_COLORS[div] } : {}}
        >
          {div}
        </button>
      ))}
    </div>
  )
}
