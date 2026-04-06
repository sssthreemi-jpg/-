import { usePeriod } from '../contexts/PeriodContext'

export function ErrorState({ onRetry }) {
  return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-2">데이터를 불러올 수 없습니다</p>
      <p className="text-sm text-gray-400 mb-4">네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export function NoDataState() {
  const { year, quarter } = usePeriod()
  const label = quarter > 0 ? `${year}년 ${quarter}Q` : `${year}년`
  return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-2">{label} 데이터가 없습니다</p>
      <p className="text-sm text-gray-400">다른 기간을 선택해주세요</p>
    </div>
  )
}
