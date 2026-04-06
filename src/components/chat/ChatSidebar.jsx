/**
 * 대화 이력 사이드바 — 날짜별 그룹핑, 검색, 삭제
 */
import { useState, useMemo, useDeferredValue } from 'react';
import { groupByDate, relativeTime } from '../../utils/dateGroup';

export default function ChatSidebar({
  conversations,
  activeConvId,
  onSelect,
  onDelete,
  onNewChat,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);

  const groups = useMemo(() => {
    if (!deferredQuery) return groupByDate(conversations);
    const q = deferredQuery.toLowerCase();
    const filtered = conversations.filter(c =>
      c.title?.toLowerCase().includes(q)
    );
    return groupByDate(filtered);
  }, [conversations, deferredQuery]);

  return (
    <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-xl flex flex-col rounded-2xl overflow-hidden animate-sidebar-in">
      {/* ─── 헤더 ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <h3 className="font-bold text-sm text-gray-800">대화 기록</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary-dark hover:bg-primary/20 transition-colors font-medium min-h-[36px]"
          >
            + 새 대화
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-border-light transition-colors"
            aria-label="대화 기록 닫기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── 검색 ─── */}
      <div className="px-4 py-2 border-b border-border-light flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="대화 검색..."
            aria-label="대화 검색"
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border
              focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
              placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* ─── 대화 목록 ─── */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="대화 기록 목록">
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-10 h-10 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-xs">
              {searchQuery ? '검색 결과가 없습니다' : '대화 기록이 없습니다'}
            </p>
          </div>
        )}

        {groups.map(({ label, items }) => (
          <div key={label} role="group" aria-label={label}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 pt-3 pb-1">
              {label}
            </p>
            {items.map(conv => (
              <div key={conv.id} className="flex items-center" role="listitem">
                <button
                  onClick={() => onSelect(conv.id)}
                  className={`flex-1 text-left px-4 py-2.5 min-h-[44px] transition-colors
                    ${conv.id === activeConvId
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-surface border-l-2 border-transparent'
                    }`}
                  aria-current={conv.id === activeConvId ? 'true' : undefined}
                >
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {conv.title || '새 대화'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {relativeTime(conv.updatedAt)}
                    {conv.messageCount > 0 && ` · ${conv.messageCount}개 질문`}
                  </p>
                </button>
                <button
                  onClick={() => onDelete(conv.id)}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center
                    text-gray-300 hover:text-decrease hover:bg-red-50 transition-colors rounded-lg mr-1"
                  aria-label={`${conv.title || '대화'} 삭제`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
