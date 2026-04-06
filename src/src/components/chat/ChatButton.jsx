/**
 * 플로팅 챗봇 버튼 — 드래그로 위치 이동 가능
 * 데스크탑: 우상단 기본 / 모바일: 우하단 기본
 */
import { useDraggable } from '../../hooks/useDraggable'

function getInitialPos() {
  if (typeof window === 'undefined') return { x: 300, y: 12 }
  const isMobile = window.innerWidth < 768
  return {
    x: window.innerWidth - 140,
    y: isMobile ? window.innerHeight - 120 : 12,
  }
}

export default function ChatButton({ isOpen, onClick }) {
  const { handlers, wasDragged } = useDraggable(getInitialPos(), { minRight: 140 })

  if (isOpen) return null

  return (
    <div
      {...handlers}
      className="fixed z-50"
      style={{ ...handlers.style, cursor: 'grab' }}
    >
      <button
        onClick={() => { if (!wasDragged()) onClick() }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-primary text-white shadow-lg
          hover:bg-primary-dark active:scale-95 transition-all duration-200"
        aria-label="D-체크 AI 챗봇 열기"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          <path d="M7 9h10v2H7zM7 5h10v2H7z" opacity="0.6" />
        </svg>
        <span className="font-bold text-sm whitespace-nowrap">D-체크</span>
      </button>
    </div>
  )
}
