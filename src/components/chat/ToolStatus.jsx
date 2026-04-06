/**
 * AI 진행 상태 표시 — 단일 컴포넌트로 3단계 통합
 * 1) 분석 중 (thinking)
 * 2) 데이터 조회 중 (tool 실행)
 * 3) 보고서 작성 중 (tool 완료 후 텍스트 생성)
 */
import { memo } from 'react';

/** 단계별 표시 텍스트 */
function getStatusText(status, isThinking, isGenerating) {
  if (status) return status.label;
  if (isThinking) return '질문을 분석하고 있습니다';
  if (isGenerating) return '보고서를 작성하고 있습니다';
  return '처리 중입니다';
}

export default memo(function ToolStatus({ status, isThinking, isGenerating }) {
  if (!status && !isThinking && !isGenerating) return null;

  const text = getStatusText(status, isThinking, isGenerating);

  return (
    <div className="flex justify-start mb-3 animate-msg-in" role="status" aria-live="polite">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark
          flex items-center justify-center mr-2 mt-0.5 shadow-sm animate-thinking-pulse"
        aria-hidden="true"
      >
        <span className="text-white text-[10px] font-bold">D</span>
      </div>

      <div className="bg-white border border-primary/20 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%] shadow-sm">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 animate-spin text-primary flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-gray-800 font-medium">{text}</span>
        </div>

        {/* 진행 바 — tool 실행 중에만 */}
        {status && (
          <div className="mt-2 h-1 w-full rounded-full bg-border-light overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent animate-progress-flow" />
          </div>
        )}
      </div>
    </div>
  );
});
