/**
 * 추천 질문 버튼 목록
 */

const SUGGESTED_QUESTIONS = [
  '전사 26년 1분기 매출 실적',
  'ETC 주요 품목별 매출 현황',
  '사업부별 원가율 비교',
  '전사 25년 비용 분석',
  '26년 목표 대비 매출 달성률',
];

export default function ChatSuggestions({ onSelect }) {
  return (
    <div className="px-4 pb-3">
      <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-primary/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        이런 것들을 물어보세요
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="animate-chip-in text-xs px-3 py-1.5 rounded-full
              border border-primary/25 text-primary-dark bg-white
              hover:bg-primary/10 hover:border-primary/40 hover:scale-[1.03]
              active:scale-[0.97] active:bg-primary/20
              transition-all duration-200 whitespace-nowrap
              shadow-sm hover:shadow-md hover:shadow-primary/10"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
